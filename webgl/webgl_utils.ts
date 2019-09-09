/* =========================================================================
 *
 *  webgl_utils.ts
 *  utils for webgl
 *  part of source code referenced by tantalum-gl.js
 * ========================================================================= */

declare var gl: any
declare var multiBufExt: any

export function GetGLTypeSize(type: any) {
  switch (type) {
    case gl.BYTE:
    case gl.UNSIGNED_BYTE:
      return 1
    case gl.SHORT:
    case gl.UNSIGNED_SHORT:
      return 2
    case gl.INT:
    case gl.UNSIGNED_INT:
    case gl.FLOAT:
      return 4
    default:
      return 0
  }
}

export class Texture {
  type: any
  format: any
  glName: any
  texture: any
  constructor(
    channels: number,
    isFloat: boolean,
    texels: any,
    texType: any = gl.REPEAT,
    texInterpolation: any = gl.LINEAR,
    useMipmap: boolean = true
  ) {
    this.type = isFloat ? gl.FLOAT : gl.UNSIGNED_BYTE
    this.format = [gl.LUMINANCE, gl.RG, gl.RGB, gl.RGBA][channels - 1]

    this.glName = gl.createTexture()
    this.bind(this.glName)
    gl.texImage2D(gl.TEXTURE_2D, 0, this.format, this.format, this.type, texels)

    if (useMipmap) {
      gl.generateMipmap(gl.TEXTURE_2D)
    }

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, texInterpolation)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, texInterpolation)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, texType)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, texType)
    this.texture = this.glName
    this.bind(null)
  }

  bind(tex: any) {
    gl.bindTexture(gl.TEXTURE_2D, tex)
  }
}

export class CubeMapTexture {
  cubeSource: Array<any>
  cubeTarget: Array<any>
  cubeImage: any
  cubeTexture: any
  constructor(texArray: Array<any>) {
    this.cubeSource = texArray
    this.cubeTarget = new Array(
      gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
    )
    this.loadCubeTexture()
    this.cubeTexture = undefined
    this.cubeImage = undefined
  }

  loadCubeTexture() {
    let cubeImage = new Array()
    let loadFlagCnt = 0
    this.cubeImage = cubeImage
    for (let i = 0; i < this.cubeSource.length; i++) {
      cubeImage[i] = new Object()
      cubeImage[i].data = new Image()
      cubeImage[i].data.src = this.cubeSource[i]
      cubeImage[i].data.onload = () => {
        loadFlagCnt++
        // check image load
        if (loadFlagCnt === this.cubeSource.length) {
          this.generateCubeMap()
        }
      }
    }
  }

  generateCubeMap() {
    let tex = gl.createTexture()

    gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex)

    for (let j = 0; j < this.cubeSource.length; j++) {
      gl.texImage2D(
        this.cubeTarget[j],
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        this.cubeImage[j].data
      )
    }

    gl.generateMipmap(gl.TEXTURE_CUBE_MAP)

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    this.cubeTexture = tex

    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null)
  }
}

export class RenderTarget {
  glName: any
  constructor() {
    this.glName = gl.createFramebuffer()
  }
  bind() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.glName)
  }

  unbind() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  attachTexture(texture: any, index: number) {
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0 + index,
      gl.TEXTURE_2D,
      texture.glName,
      0
    )
  }

  detachTexture(index: number) {
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0 + index,
      gl.TEXTURE_2D,
      null,
      0
    )
  }

  drawBuffers(numBufs: number) {
    let buffers = []
    for (let i = 0; i < numBufs; ++i) {
      buffers.push(gl.COLOR_ATTACHMENT0 + i)
    }
    multiBufExt.drawBuffersWEBGL(buffers)
  }
}

export class Shader {
  vertex: any
  fragment: any
  program: any
  uniforms: any
  constructor(shaderDict: any, vert: any, frag: any) {
    this.vertex = this.createShaderObject(shaderDict, vert, false)
    this.fragment = this.createShaderObject(shaderDict, frag, true)

    this.program = gl.createProgram()
    gl.attachShader(this.program, this.vertex)
    gl.attachShader(this.program, this.fragment)
    gl.linkProgram(this.program)

    this.uniforms = {}

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      alert('Could not initialise shaders')
    }
  }

  bind() {
    gl.useProgram(this.program)
  }

  createShaderObject(shaderDict: any, name: any, isFragment: any) {
    let shaderSource = this.resolveShaderSource(shaderDict, name)
    let shaderObject = gl.createShader(
      isFragment ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER
    )
    gl.shaderSource(shaderObject, shaderSource)
    gl.compileShader(shaderObject)

    if (!gl.getShaderParameter(shaderObject, gl.COMPILE_STATUS)) {
      /* Add some line numbers for convenience */
      let lines = shaderSource.split('\n')
      for (let i = 0; i < lines.length; ++i) {
        lines[i] = ('   ' + (i + 1)).slice(-4) + ' | ' + lines[i]
      }
      shaderSource = lines.join('\n')

      throw new Error(
        (isFragment ? 'Fragment' : 'Vertex') +
          " shader compilation error for shader '" +
          name +
          "':\n\n    " +
          gl
            .getShaderInfoLog(shaderObject)
            .split('\n')
            .join('\n    ') +
          '\nThe expanded shader source code was:\n\n' +
          shaderSource
      )
    }

    return shaderObject
  }

  resolveShaderSource(shaderDict: any, name: any) {
    if (!(name in shaderDict)) {
      throw new Error("Unable to find shader source for '" + name + "'")
    }
    let shaderSource = shaderDict[name]

    /* Rudimentary include handling for convenience.
               Not the most robust, but it will do for our purposes */
    let pattern = new RegExp('#include "(.+)"')
    let match = pattern.exec(shaderSource)
    while (match) {
      shaderSource =
        shaderSource.slice(0, match.index) +
        this.resolveShaderSource(shaderDict, match[1]) +
        shaderSource.slice(match.index + match[0].length)

      match = pattern.exec(shaderSource)
    }

    return shaderSource
  }

  uniformIndex(name: any) {
    if (!(name in this.uniforms)) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name)
    }
    return this.uniforms[name]
  }

  uniformTexture(name: any, texture: any) {
    let id = this.uniformIndex(name)
    if (id !== -1) {
      gl.uniform1i(id, texture.boundUnit)
    }
  }

  uniformF(name: any, f: any) {
    let id = this.uniformIndex(name)
    if (id !== -1) {
      gl.uniform1f(id, f)
    }
  }

  uniform2F(name: any, f1: any, f2: any) {
    let id = this.uniformIndex(name)
    if (id !== -1) {
      gl.uniform2f(id, f1, f2)
    }
  }
}

// add attribute -> init -> copy -> bind -> draw -> release
export class VertexBuffer {
  attributes: any
  elementSize: number
  glName: any
  length: number
  constructor() {
    this.attributes = []
    this.elementSize = 0
    this.length = 0
  }

  bind(shader: any) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.glName)

    for (let i = 0; i < this.attributes.length; ++i) {
      this.attributes[i].index = gl.getAttribLocation(
        shader.program,
        this.attributes[i].name
      )
      if (this.attributes[i].index >= 0) {
        let attr = this.attributes[i]
        gl.enableVertexAttribArray(attr.index)
        gl.vertexAttribPointer(
          attr.index,
          attr.size,
          attr.type,
          attr.norm,
          this.elementSize,
          attr.offset
        )
      }
    }
  }

  release() {
    for (let i = 0; i < this.attributes.length; ++i) {
      if (this.attributes[i].index >= 0) {
        gl.disableVertexAttribArray(this.attributes[i].index)
        this.attributes[i].index = -1
      }
    }
  }

  addAttribute(name: any, size: any, type: any, norm: any) {
    this.attributes.push({
      name: name,
      size: size,
      type: type,
      norm: norm,
      offset: this.elementSize,
      index: -1
    })
    this.elementSize += size * GetGLTypeSize(type)
  }

  addAttributes(attrArray: Array<string>, sizeArray: Array<number>) {
    for (let i = 0; i < attrArray.length; i++) {
      this.addAttribute(attrArray[i], sizeArray[i], gl.FLOAT, false)
    }
  }

  init(numVerts: number) {
    this.length = numVerts
    this.glName = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.glName)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      this.length * this.elementSize,
      gl.STATIC_DRAW
    )
  }

  copy(data: any) {
    data = new Float32Array(data)
    if (data.byteLength !== this.length * this.elementSize) {
      throw new Error('Resizing VBO during copy strongly discouraged')
    }
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
  }

  draw(mode: any, length?: number) {
    gl.drawArrays(mode, 0, length ? length : this.length)
  }
}

export class IndexBuffer {
  attributes: any
  glName: any
  length: number
  constructor() {
    this.length = 0
  }

  bind() {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.glName)
  }

  init(index: any) {
    this.length = index.length
    this.glName = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.glName)
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Int16Array(index),
      gl.STATIC_DRAW
    )
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)
  }

  draw(mode: any, length?: number) {
    gl.drawElements(mode, length ? length : this.length, gl.UNSIGNED_SHORT, 0)
  }
}

export class FrameBuffer {
  width: number
  height: number
  framebuffer: any
  depthbuffer: any
  targetTexture: any

  constructor(width: number, height: number) {
    this.width = width
    this.height = height

    let frameBuffer = gl.createFramebuffer()
    this.framebuffer = frameBuffer

    let depthRenderBuffer = gl.createRenderbuffer()
    this.depthbuffer = depthRenderBuffer

    let fTexture = gl.createTexture()
    this.targetTexture = fTexture
  }

  bindFrameBuffer() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer)
  }

  bindDepthBuffer() {
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthbuffer)
    // setiing render buffer to depth buffer
    gl.renderbufferStorage(
      gl.RENDERBUFFER,
      gl.DEPTH_COMPONENT16,
      this.width,
      this.height
    )
    // attach depthbuffer to framebuffer
    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.RENDERBUFFER,
      this.depthbuffer
    )
  }

  renderToTexure() {
    gl.bindTexture(gl.TEXTURE_2D, this.targetTexture)

    // make sure we have enought memory to render the width x height size texture
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      this.width,
      this.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    )

    // texture settings
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)

    // attach framebuff to texture
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.targetTexture,
      0
    )
  }

  renderToShadowTexure() {
    gl.bindTexture(gl.TEXTURE_2D, this.targetTexture)

    // make sure we have enought memory to render the width x height size texture
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      this.width,
      this.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    )

    // texture settings
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    // attach framebuff to texture
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.targetTexture,
      0
    )
  }

  renderToFloatTexure() {
    gl.bindTexture(gl.TEXTURE_2D, this.targetTexture)

    // make sure we have enought memory to render the width x height size texture
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      this.width,
      this.height,
      0,
      gl.RGBA,
      gl.FLOAT,
      null
    )

    // texture settings
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    // attach framebuff to texture
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.targetTexture,
      0
    )
  }

  renderToCubeTexture(cubeTarget: Array<any>) {
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.targetTexture)

    for (let i = 0; i < cubeTarget.length; i++) {
      gl.texImage2D(
        cubeTarget[i],
        0,
        gl.RGBA,
        this.width,
        this.height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
      )
    }

    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }

  releaseCubeTex() {
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null)
    gl.bindRenderbuffer(gl.RENDERBUFFER, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  release() {
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.bindRenderbuffer(gl.RENDERBUFFER, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }
}
