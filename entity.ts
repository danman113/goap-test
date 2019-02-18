import { Action, Wait, Dance, Planner, TimeAction } from './goap';
import { v2, Vec2, sum, clampLength, scalarMultiply, zero, magnitude, unit } from './math/v2'

export interface Static {
  position: Vec2
  dimensions: Vec2
  center: Vec2
  draw(c: CanvasRenderingContext2D): void
  update(delta: number, world: World): void
  tag?: string
}

export interface Mob extends Static {
  velocity: Vec2
  acceleration: Vec2
  maxVelocity: number
  maxAcceleration: number
  state: { [index: string]: any }
}

export class LabeledStatic implements Static {
  public name: string
  public bgColor: string
  public textColor: string
  public fontSize: number
  public position: Vec2
  public dimensions: Vec2
  public tag: string
  constructor ({
    name = '',
    bgColor = 'grey',
    textColor = 'white',
    fontSize = 14,
    position,
    tag = 'misc',
    dimensions = v2(20, 20)
  }: {
    name?: string,
    bgColor?: string,
    textColor?: string,
    fontSize?: number,
    position: Vec2,
    tag: string
    dimensions?: Vec2
  }) {
    this.name = name
    this.textColor = textColor
    this.bgColor = bgColor
    this.fontSize = fontSize
    this.position = position
    this.dimensions = dimensions
    this.tag = tag
  }

  public get center () {
    return sum(this.position, scalarMultiply(this.dimensions, 0.5))
  }

  public update () {

  }

  public draw (c: CanvasRenderingContext2D) {
    c.fillStyle = this.bgColor
    c.fillRect(this.position.x, this.position.y, this.dimensions.x, this.dimensions.y)
    c.fillStyle = this.textColor
    c.font = `${this.fontSize}px sans-serif`
    c.textBaseline = 'middle'
    const textWidth = c.measureText(this.name).width
    c.fillText(this.name, this.position.x + ((this.dimensions.x - textWidth) / 2), this.position.y + this.dimensions.y / 2, this.dimensions.x)
  }
}


export class Person implements Mob {
  public name: string
  public color: string
  public position: Vec2
  public dimensions: Vec2
  public velocity: Vec2
  public acceleration: Vec2
  public maxVelocity: number = 4
  public maxAcceleration: number = 0.1
  public planner: Planner
  public tag: string = 'actor'
  public state: { [index: string]: any } = {}
  private selectedAction: Action = null
  private lastAction: Action = null
  public actions: Action[] = []
  constructor ({
    name = '',
    position,
    dimensions = v2(20, 20),
    color = 'beige',
    planner
  }: {
    name?: string,
    position: Vec2,
    dimensions?: Vec2,
    color?: string,
    planner?: Planner
  }) {
    this.name = name
    this.color = color
    this.position = position
    this.dimensions = dimensions
    this.velocity = zero()
    this.acceleration = zero()
    this.planner = planner
  }

  private selectAction (world: World) {
    if (this.selectedAction === null) {
      if (this.actions.length < 1) {
        if (this.planner) {
          this.actions = this.planner.getPlan('survive', world, this)
        } else {
          this.actions.push(new Dance())
        }
      }

      this.selectedAction = this.actions.shift()
      this.selectedAction.init && this.selectedAction.init(world, this)
    }
  }

  private doAction (world: World) {
    this.selectAction(world)
    if(this.selectedAction.update(world, this)) {
      if (this.selectedAction.done) this.selectedAction.done(world, this)
      this.lastAction = this.selectedAction
      this.selectedAction = null
    }
  }

  public update (delta: number, world: World) {
    this.doAction(world)
    this.velocity = sum(this.velocity, this.acceleration)
    this.velocity = clampLength(this.velocity, this.maxVelocity)
    this.position = sum(this.position, this.velocity)
  }

  public get center () {
    return sum(this.position, scalarMultiply(this.dimensions, 0.5))
  }

  public draw (c: CanvasRenderingContext2D) {
    c.fillStyle = this.color
    c.strokeStyle = '#DDD'
    c.lineWidth = 3
    c.beginPath()
    c.arc(this.position.x + this.dimensions.x / 2, this.position.y + this.dimensions.y / 2, this.dimensions.x / 2, 0, 2 * Math.PI)
    c.fill()
    c.stroke()
    if (this.selectedAction) {
      c.fillStyle = '#333'
      c.font = `16px sans-serif`
      c.textBaseline = 'middle'
      const text = this.selectedAction.label()
      const textWidth = c.measureText(text).width
      c.fillText(text, this.position.x - (textWidth / 2), this.position.y - 20)
      if ((<TimeAction>this.selectedAction).duration) {
        const duration = (<TimeAction>this.selectedAction).duration
        const timeElapsed = this.state.timeElapsed
        c.fillStyle = 'red'
        const width = 100
        const height = 10
        c.fillRect(this.position.x - width / 2, this.position.y - height - 2, width, height)
        c.fillStyle = 'green'
        c.fillRect(this.position.x - width / 2, this.position.y - height - 2, width * (timeElapsed / duration), height)
      }
    }
  }
}

export class World {
  public objs: Static[]
  public mobs: Mob[]
  public width: number
  public height: number
  public canvas: HTMLCanvasElement
  public mouse: Vec2
  public c: CanvasRenderingContext2D
  constructor (canvas: HTMLCanvasElement) {
    this.objs = []
    this.mobs = []
    this.canvas = canvas
    this.c = canvas.getContext('2d')
    this.width = canvas.width = window.innerWidth
    this.height = canvas.height = window.innerHeight
    canvas.style.width = `${this.width}px`
    canvas.style.height = `${this.height}px`
    this.mouse = zero()
    canvas.addEventListener('mousemove', e => {
      if (e.offsetX) {
        this.mouse.x = e.offsetX
        this.mouse.y = e.offsetY
      } else if (e.layerX) {
        var box = this.canvas.getBoundingClientRect()
        this.mouse.x = (e.layerX - box.left)
        this.mouse.y = (e.layerY - box.top)
      }
    })
    this.run = this.run.bind(this)
  }

  draw () {
    this.c.clearRect(0, 0, this.width, this.height)
    for(let obj of this.objs) {
      obj.draw(this.c)
    }

    for(let mob of this.mobs) {
      mob.draw(this.c)
    }
  }

  update (delta: number) {
    for(let obj of this.objs) {
      obj.update(delta, this)
    }

    for(let mob of this.mobs) {
      mob.update(delta, this)
    }
  }

  run (delta: number = 0) {
    this.update(delta)
    this.draw()
    window.requestAnimationFrame(this.run)
  }

  pushObj (...obj: Static[]) {
    this.objs.push(...obj)
  }
  pushMob (...obj: Mob[]) {
    this.mobs.push(...obj)
  }
}
