import { Action, Wait, Dance, Planner, TimeAction } from './goap';
import { v2, Vec2, sum, clampLength, scalarMultiply, zero, distance } from './math/v2'
import { clamp } from './math/util';

export interface Static {
  position: Vec2 // Position of static
  dimensions: Vec2 // x: width, y: height
  center: Vec2 // Center getter
  draw(c: CanvasRenderingContext2D, world: World): void
  update(delta: number, world: World): void
  tag?: string // Helps find this kind of object
}

export interface Mob extends Static {
  velocity: Vec2
  acceleration: Vec2
  maxVelocity: number
  maxAcceleration: number
  state: { [index: string]: any } // Just a place to throw data. Would be more structured if this wasn't a test
}

export interface Living extends Mob {
  addHunger(n: number): void
  addThirst(n: number): void
  addFatigue(n: number): void
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


export class Person implements Living {
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
  public state: { [index: string]: any } = {
    hunger: 100000,
    thirst: 100000,
    fatigue: 100000
  }

  private selectedAction: Action = null
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

  public addHunger (n: number) {
    this.state.hunger = clamp(this.state.hunger + n, 0, 100000)
  }

  public addThirst (n: number) {
    this.state.thirst = clamp(this.state.thirst + n, 0, 100000)
  }

  public addFatigue (n: number) {
    this.state.fatigue = clamp(this.state.fatigue + n, 0, 100000)
  }

  private live () {
    const speed = 5
    this.addHunger(-2 * speed)
    this.addThirst(-5 * speed)
    this.addFatigue(-4 * speed)
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
      if (this.selectedAction.verify && !this.selectedAction.verify(world, this)) {
        console.log('discarding action')
        this.actions = this.planner.getPlan('survive', world, this)
        this.selectedAction = this.actions.shift()
      }
      this.selectedAction.init && this.selectedAction.init(world, this)
    }
  }

  private doAction (world: World) {
    this.selectAction(world)
    if(this.selectedAction.update(world, this)) {
      if (this.selectedAction.done) this.selectedAction.done(world, this)
      this.selectedAction = null
    }
  }

  public update (delta: number, world: World) {
    this.live()
    this.doAction(world)
    this.velocity = sum(this.velocity, this.acceleration)
    this.velocity = clampLength(this.velocity, this.maxVelocity)
    this.position = sum(this.position, this.velocity)
  }

  public get center () {
    return sum(this.position, scalarMultiply(this.dimensions, 0.5))
  }

  public draw (c: CanvasRenderingContext2D, world: World) {
    c.fillStyle = this.color
    c.strokeStyle = '#DDD'
    c.lineWidth = 3
    c.beginPath()
    c.arc(this.position.x, this.position.y, this.dimensions.x / 2, 0, 2 * Math.PI)
    c.fill()
    c.stroke()
    const isHover = distance(this.position, world.mouse) <= this.dimensions.x
    if (isHover) {
      if (this.selectedAction) {
        c.fillStyle = '#333'
        c.font = `16px sans-serif`
        c.textBaseline = 'middle'
        const text = this.selectedAction.label()
        const textWidth = c.measureText(text).width
        c.fillText(text, this.position.x - (textWidth / 2), this.position.y - 25)
        if ((<TimeAction>this.selectedAction).duration) {
          const duration = (<TimeAction>this.selectedAction).duration
          const timeElapsed = this.state.timeElapsed
          c.fillStyle = 'red'
          const width = 100
          const height = 10
          c.fillRect(this.position.x - width / 2, this.position.y - height - 12, width, height)
          c.fillStyle = 'green'
          c.fillRect(this.position.x - width / 2, this.position.y - height - 12, width * (timeElapsed / duration), height)
        }
      }
      const { fatigue = 0, hunger = 0, thirst = 0 } = this.state
      const maxValue = 100000
      const width = 100
      const height = 10
      const offset = 20
      c.fillStyle = '#EEE'
      c.fillRect(this.position.x - width / 2, this.position.y + height + offset, width, height)
      c.fillStyle = 'green'
      c.fillRect(this.position.x - width / 2 + (width / 3) * 0, this.position.y + height + offset, (width / 3) * (hunger / maxValue), height)
      c.fillStyle = 'blue'
      c.fillRect(this.position.x - width / 2 + (width / 3) * 1, this.position.y + height + offset, (width / 3) * (thirst / maxValue), height)
      c.fillStyle = 'yellow'
      c.fillRect(this.position.x - width / 2 + (width / 3) * 2, this.position.y + height + offset, (width / 3) * (fatigue / maxValue), height)
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

    canvas.addEventListener('click', e => {
      this.onClick()
    })

    this.run = this.run.bind(this)
  }

  onClick () {
    const {x, y} = this.mouse
    const box2 = new LabeledStatic({
      position: v2(x, y),
      dimensions: v2(10, 20),
      fontSize: 10,
      textColor: 'white',
      bgColor: 'blue',
      name: '',
      tag: 'water-pickup'
    })
    this.pushObj(box2)
  }

  draw () {
    this.c.clearRect(0, 0, this.width, this.height)
    for(let obj of this.objs) {
      obj.draw(this.c, this)
    }

    for(let mob of this.mobs) {
      mob.draw(this.c, this)
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
