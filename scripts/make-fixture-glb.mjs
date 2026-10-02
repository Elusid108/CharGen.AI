#!/usr/bin/env node
/**
 * Hand-writes two tiny GLB fixtures (no three.js): a 12-triangle cube and the same cube with a
 * one-second "spin" rotation clip. Used by the Studio smoke test and by anyone who wants to try
 * the viewport without a Tripo key.  Usage: node scripts/make-fixture-glb.mjs [outDir]
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const outDir = process.argv[2] || 'tests/fixtures'
mkdirSync(outDir, { recursive: true })

function pad4(n) {
  return (4 - (n % 4)) % 4
}

function buildGlb({ withAnimation }) {
  const h = 0.5
  const positions = new Float32Array([
    -h, -h, h, h, -h, h, h, h, h, -h, h, h, // front
    -h, -h, -h, -h, h, -h, h, h, -h, h, -h, -h, // back
    -h, h, -h, -h, h, h, h, h, h, h, h, -h, // top
    -h, -h, -h, h, -h, -h, h, -h, h, -h, -h, h, // bottom
    h, -h, -h, h, h, -h, h, h, h, h, -h, h, // right
    -h, -h, -h, -h, -h, h, -h, h, h, -h, h, -h, // left
  ])
  const normals = new Float32Array(24 * 3)
  const faceNormals = [[0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0]]
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) normals.set(faceNormals[f], (f * 4 + v) * 3)
  const indices = new Uint16Array(36)
  for (let f = 0; f < 6; f++) indices.set([f * 4, f * 4 + 1, f * 4 + 2, f * 4, f * 4 + 2, f * 4 + 3], f * 6)

  const chunks = []
  const bufferViews = []
  const accessors = []
  let offset = 0
  const push = (typed, componentType, type, extra = {}) => {
    const bytes = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength)
    chunks.push(bytes)
    const viewIndex = bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.byteLength }) - 1
    offset += bytes.byteLength
    const padding = pad4(offset)
    if (padding) {
      chunks.push(new Uint8Array(padding))
      offset += padding
    }
    return accessors.push({ bufferView: viewIndex, componentType, count: typed.length / (type === 'VEC3' ? 3 : type === 'VEC4' ? 4 : 1), type, ...extra }) - 1
  }
  const posAcc = push(positions, 5126, 'VEC3', { min: [-h, -h, -h], max: [h, h, h] })
  const norAcc = push(normals, 5126, 'VEC3')
  const idxAcc = push(indices, 5123, 'SCALAR')

  const gltf = {
    asset: { version: '2.0', generator: 'chargen-fixture' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: 'cube', mesh: 0 }],
    meshes: [{ name: 'cube', primitives: [{ attributes: { POSITION: posAcc, NORMAL: norAcc }, indices: idxAcc, material: 0 }] }],
    materials: [{ name: 'grey', pbrMetallicRoughness: { baseColorFactor: [0.7, 0.75, 0.8, 1], metallicFactor: 0, roughnessFactor: 0.6 } }],
    buffers: [{ byteLength: 0 }],
    bufferViews,
    accessors,
  }

  if (withAnimation) {
    const times = new Float32Array([0, 0.5, 1])
    const s = Math.SQRT1_2
    const rotations = new Float32Array([0, 0, 0, 1, 0, s, 0, s, 0, 1, 0, 0])
    const tAcc = push(times, 5126, 'SCALAR', { min: [0], max: [1] })
    const rAcc = push(rotations, 5126, 'VEC4')
    gltf.animations = [{
      name: 'spin',
      samplers: [{ input: tAcc, output: rAcc, interpolation: 'LINEAR' }],
      channels: [{ sampler: 0, target: { node: 0, path: 'rotation' } }],
    }]
  }

  gltf.buffers[0].byteLength = offset
  const bin = new Uint8Array(offset)
  let o = 0
  for (const c of chunks) {
    bin.set(c, o)
    o += c.byteLength
  }
  let json = Buffer.from(JSON.stringify(gltf), 'utf8')
  if (json.length % 4) json = Buffer.concat([json, Buffer.alloc(pad4(json.length), 0x20)])
  const total = 12 + 8 + json.length + 8 + bin.byteLength
  const out = Buffer.alloc(total)
  out.writeUInt32LE(0x46546c67, 0)
  out.writeUInt32LE(2, 4)
  out.writeUInt32LE(total, 8)
  out.writeUInt32LE(json.length, 12)
  out.writeUInt32LE(0x4e4f534a, 16)
  json.copy(out, 20)
  const binStart = 20 + json.length
  out.writeUInt32LE(bin.byteLength, binStart)
  out.writeUInt32LE(0x004e4942, binStart + 4)
  Buffer.from(bin.buffer).copy(out, binStart + 8)
  return out
}

writeFileSync(join(outDir, 'cube.glb'), buildGlb({ withAnimation: false }))
writeFileSync(join(outDir, 'cube-anim.glb'), buildGlb({ withAnimation: true }))
console.log(`wrote ${join(outDir, 'cube.glb')} and cube-anim.glb`)
