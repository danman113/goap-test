import { rand } from './math/util';
import { Vec2, distance, clampLength, sub, scalarMultiply, sum, zero, v2, unit, magnitude, degToRad } from './math/v2';
import { World, Mob, Static, LabeledStatic, Living } from './entity';

export interface Action {
  goal: string
  preconditions: string[]
  label(): string
  shouldDo(world: World, actor: Mob): boolean
  verify?(world: World, actor: Mob): boolean
  init?(world: World, actor: Mob): void
  condition?(world: World, actor: Mob): boolean
  cost(world: World, actor: Mob): number
  update(world: World, actor: Mob): boolean
  done?(world: World, actor: Mob): void
}

export interface TimeAction extends Action {
  duration: number
}

export type MobSideEffect = (world: World, mob: Mob) => void

export class EmptyRootAction implements Action {
  public goal = '-'
  public preconditions: string[]  = []
  cost (world: World, mob: Mob) {
    return 0
  }

  shouldDo(world: World, mob: Mob) {
    return true
  }

  label () {
    return this.goal
  }

  update (world: World, mob: Mob) {
    return true
  }
}
export class MoveTo implements Action {
  public goal: string = 'move-to'
  public preconditions: string[] = []
  protected position: Vec2
  protected radius: number = 100
  protected minDistance: number = 5
  constructor(pt: Vec2) {
    this.position = pt
  }

  label () {
    return 'Moving Somewhere'
  }

  cost(world: World, actor: Mob) {
    return Math.floor(distance(this.position, actor.center) / (actor.maxVelocity * 60))
  }

  shouldDo(world: World, actor: Mob) {
    const dist = distance(this.position, actor.center)
    return !(dist < this.minDistance)
  }

  update(world: World, actor: Mob): boolean {
    const dist = distance(this.position, actor.center)
    if (dist < this.minDistance) {
      actor.acceleration = zero()
      actor.velocity = zero()
      return true
    }
    let desired = sub(this.position, actor.center)
    const mag = magnitude(desired)
    desired = unit(desired)
    if (mag < this.radius) {
      const percent = (mag / this.radius) * actor.maxVelocity
      desired = scalarMultiply(desired, percent)
    } else {
      desired = scalarMultiply(desired, actor.maxVelocity)
    }

    const steer = clampLength(sub(desired, actor.velocity), actor.maxAcceleration)
    actor.acceleration = steer
    return false
  }
}

export class Dance extends MoveTo {
  public goal: string = 'dance'
  public duration: number
  private startingLocation: Vec2
  private timeStarted: number
  private distance: number

  constructor (seconds: number = 2, distance: number = 10) {
    super(null)
    this.radius = 1
    this.duration = seconds * 60
    this.distance = distance
    this.timeStarted = 0
  }

  init (world: World, actor: Mob) {
    this.startingLocation = actor.center
  }
  cost(world: World, actor: Mob) {
    return this.duration
  }

  shouldDo () {
    return true
  }

  label () {
    return 'Dancing!'
  }

  update(world: World, actor: Mob): boolean {
    this.timeStarted++
    const timeElapsed = this.timeStarted > this.duration
    if (timeElapsed) {
      this.radius = 50
      this.position = this.startingLocation
      return super.update(world, actor)
    } else if (this.position === null) {
      this.position = sub(this.startingLocation, v2(rand(-this.distance, this.distance), rand(-this.distance, this.distance)))
      return false
    } else {
      if (super.update(world, actor)) {
        this.position = null
      }
      return null
    }
  }
}

export class MoveToTag extends MoveTo {
  public goal: string = 'move-to-tag'
  private tag: string
  constructor(world: World, tag: string) {
    super(zero())
    this.goal = `move-to-${tag}`
    this.tag = tag
  }

  label () {
    return `Moving to find ${this.tag}`
  }

  cost(world: World, actor: Mob) {
    const closest = this.getClosestTag(world, actor)
    if (!closest) return Infinity
    return Math.floor(distance(closest.center, actor.center) / (actor.maxVelocity * 60))
  }

  shouldDo(world: World, actor: Mob) {
    //  @TODO: Figure out how to do this. This doesn't actually matter
    // const closest = this.getClosestTag(world, actor)
    // if (!closest) return false
    // const dist = distance(closest.center, actor.center)
    // return !(dist < 0.5)
    return true
  }

  private getClosestTag (world: World, actor: Mob) {
    let tags = world.objs.filter(obj => obj.tag === this.tag)
    if (tags.length < 1) {
      console.error('Could not find object of type', this.tag)
      return null
    }
    let closestTagDistance = Infinity
    let closestTag = null
    for (let tag of tags) {
      const dist = distance(tag.center, actor.center)
      if (dist < closestTagDistance) {
        closestTagDistance = dist
        closestTag = tag
      }
    }
    return closestTag
  }

  update(world: World, actor: Mob): boolean {
    const closest = this.getClosestTag(world, actor)
    if (!closest) return false
    this.position = closest.center
    return super.update(world, actor)
  }
}

export class Wait implements TimeAction {
  public goal: string = 'wait'
  public preconditions: string[] = []
  public duration: number
  private seconds: number = 5
  constructor (seconds: number = 5) {
    this.seconds = seconds
    this.duration = seconds * 60
  }

  cost (world: World, mob: Mob) {
    return this.seconds
  }

  label () {
    return `Waiting for ${this.seconds} seconds`
  }

  shouldDo (world: World, actor: Mob) {
    return true
  }

  update (world: World, actor: Mob) {
    actor.state.timeElapsed = (actor.state.timeElapsed || 0) + 1
    actor.velocity = zero()
    actor.acceleration = zero()
    return actor.state.timeElapsed > this.duration
  }

  done(world: World, actor: Mob) {
    actor.state.timeElapsed = 0
  }
}

export class PickupFood extends Wait {
  public goal: string = 'has-food'
  public preconditions: string[] = ['has-money', 'move-to-food']

  constructor (seconds: number = 10) {
    super(seconds)
  }

  label () {
    return 'Buying Food'
  }

  done(world: World, actor: Mob) {
    super.done(world, actor)
    actor.state.food = (actor.state.food || 0) + 1
    actor.state.money = (actor.state.money || 0) - 1
  }

  shouldDo(world: World, actor: Mob) {
    return (actor.state.food || 0) < 1
  }
}

export class PickupWater extends Wait {
  public goal: string = 'has-water'
  public preconditions: string[] = ['move-to-water']

  constructor (seconds: number = 10) {
    super(seconds)
  }

  label () {
    return 'Gathering Water'
  }

  done(world: World, actor: Mob) {
    super.done(world, actor)
    actor.state.water = (actor.state.water || 0) + 1
  }

  shouldDo(world: World, actor: Mob) {
    return (actor.state.water || 0) < 1
  }
}

export class SellWater extends Wait {
  public goal: string = 'has-money'
  public preconditions: string[] = ['has-water', 'move-to-sell']

  constructor (seconds: number = 10) {
    super(seconds)
  }

  label () {
    return 'Selling Water'
  }

  done(world: World, actor: Mob) {
    super.done(world, actor)
    actor.state.water = (actor.state.water || 0) - 1
    actor.state.money = (actor.state.money || 0) + 1
  }

  shouldDo(world: World, actor: Mob) {
    return (actor.state.money || 0) < 1
  }
}

export class Sleep extends Wait {
  public goal: string = 'consume-sleep'
  public preconditions: string[] = ['move-to-sleep']

  constructor (seconds: number = 100) {
    super(seconds)
  }

  label () {
    return 'Sleeping...'
  }

  done(world: World, actor: Living) {
    super.done(world, actor)
    actor.addFatigue(70000)
  }
}

export class NeedsFood extends EmptyRootAction {
  public goal: string = 'survive'
  public preconditions: string[] = ['consume-food']

  cost (world: World, mob: Living) {
    const { hunger } = mob.state
    const factor = hunger / 10000
    return factor + factor * factor
  }
}

export class NeedsWater extends EmptyRootAction {
  public goal: string = 'survive'
  public preconditions: string[] = ['consume-water']

  cost (world: World, mob: Living) {
    const { thirst } = mob.state
    const factor = thirst / 10000
    return factor + factor * factor
  }
}

export class NeedsSleep extends EmptyRootAction {
  public goal: string = 'survive'
  public preconditions: string[] = ['consume-sleep']

  cost (world: World, mob: Living) {
    const { fatigue } = mob.state
    const factor = fatigue / 10000
    return factor + (factor * factor) * 2
  }
}

export class Relax extends Wait {
  public goal: string = 'survive'
  public preconditions: string[] = []
  constructor (seconds: number = 5) {
    super(5)
  }

  cost (world: World, mob: Living) {
    return 70 + rand(-4, 10)
  }

  label () {
    return 'Relaxing...'
  }
}

export class Explore extends MoveTo {
  public goal: string = 'survive'
  public preconditions: string[] = []
  constructor (public range: number = 400) {
    super(zero())
  }

  cost (world: World, actor: Mob) {
    actor.state.exploreCoordinate = sum(v2(rand(-this.range, this.range), rand(-this.range, this.range)), actor.center)
    this.position = actor.state.exploreCoordinate
    const totalCost = super.cost(world, actor)
    return (totalCost * 40) + rand(5, 30)
  }

  update (world: World, actor: Mob) {
    this.position = actor.state.exploreCoordinate
    return super.update(world, actor)
  }

  label () {
    return 'Exploring'
  }
}

export class PickupItem extends MoveTo {
  public goal: string = 'survive'
  public preconditions: string[] = []
  protected itemTag: string
  constructor (public tag: string, public pickupEffect: MobSideEffect = () => {}) {
    super(zero())
    this.itemTag = `${tag}-pickup`
    this.goal = `has-${tag}`
  }

  cost (world: World, actor: Mob) {
    const itemsWithTag = world.objs.filter(obj => obj.tag === this.itemTag)
    if (itemsWithTag.length < 1) return Infinity
    let closestItem = null
    let closestItemDistance = Infinity
    for (let item of itemsWithTag) {
      const newDist = distance(item.center, actor.center)
      if (newDist < closestItemDistance) {
        closestItem = item
        closestItemDistance = newDist
      }
    }
    actor.state.pickupItem = closestItem
    this.position = closestItem.center
    return super.cost(world, actor)
  }

  update (world: World, actor: Mob) {
    const itemIndex = world.objs.indexOf(actor.state.pickupItem)
    const itemStillExist = itemIndex >= 0
    if (!itemStillExist) return true
    this.position = actor.state.pickupItem.center
    const isOnItem = super.update(world, actor)
    if (isOnItem) {
      world.objs.splice(itemIndex, 1)
      this.pickupEffect(world, actor)
    }
    return isOnItem
  }

  label () {
    return `Picking up ${this.tag}`
  }
}

export class ConsumeItem extends Wait {
  public goal: string
  public preconditions: string[]
  private item: string
  private effect: MobSideEffect
  constructor (seconds: number = 10, item: string, effect: MobSideEffect = () => {}) {
    super(seconds)
    this.goal = `consume-${item}`
    this.preconditions = [`has-${item}`]
    this.item = item
    this.effect = effect
  }

  verify (world: World, actor: Mob) {
    return actor.state[this.item] && actor.state[this.item] >= 1
  }

  label () {
    return `Consuming ${this.item}`
  }

  done(world: World, actor: Mob) {
    super.done(world, actor)
    actor.state[this.item] = actor.state[this.item] - 1
    this.effect(world, actor)
  }
}

export class EatDirt extends Wait {
  public goal: string = 'has-food'

  cost () {
    return 99
  }

  label () {
    return 'Eating Dirt...'
  }

  constructor (seconds: number = 2) {
    super(seconds)
  }

  done(world: World, actor: Mob) {
    super.done(world, actor)
    actor.state.money = (actor.state.money || 0) - 1
    actor.state.food = (actor.state.food || 0) + 1
  }

  shouldDo(world: World, actor: Mob) {
    return (actor.state.food || 0) < 1
  }
}

class Node {
  public children: Node[] = []
  public goal: string
  public cost: number = 0
  public action: Action = null
  public initialCost: number = 0
  constructor (action: Action) {
    this.goal = action.goal
    this.action = action
  }

  addChildren(...children: Node[]) {
    this.children.push(...children)
  }

  updateCost (world: World, actor: Mob): void {
    this.initialCost = this.action.cost(world, actor)
    let totalChildCost = 0
    if (this.children.length > 0) {
      const goalHash: {[index: string]: number} = {}
      for (let child of this.children) {
        child.updateCost(world, actor)
        if (child.cost === Infinity) break
        totalChildCost += child.cost
        if (!goalHash[child.goal]) {
          goalHash[child.goal] = child.cost
        } else {
          totalChildCost -= Math.max(child.cost, goalHash[child.goal])
          goalHash[child.goal] = Math.min(child.cost, goalHash[child.goal])
        }
      }
    }
    this.cost = this.initialCost + totalChildCost
  }

  getLowestCostChildren (world: World, actor: Mob): Node[] {
    let instructions: Node[] = []
    if (this.children.length > 0) {
      let childrenNoDupes: Node[] = []
      const goalHash: {[index: string]: number} = {}
      for (let child of this.children) {
        if (!goalHash[child.goal]) {
          goalHash[child.goal] = child.cost
          childrenNoDupes.push(child)
        } else if (goalHash[child.goal] > child.cost) {
          childrenNoDupes = childrenNoDupes.filter(elem => elem.goal !== child.goal)
          childrenNoDupes.push(child)
        }
      }
      childrenNoDupes.forEach(child => {
        if (child.action.shouldDo(world, actor)) instructions.push(...child.getLowestCostChildren(world, actor))
      })
    }
    instructions.push(this)
    return instructions
  }
}

export interface Planner {
  actions: Action[]
  plans: any
  getPlan(goal: string, world: World, actor: Mob): Action[]
  updateCosts(goal: string, world: World, actor: Mob): void
}

export class GOAPPlanner implements Planner {
  public actions: Action[] = []
  public plans: { [goal: string]: Node } = {}
  constructor (actions: Action[]) {
    this.actions.push(...actions)
  }

  private findPreconditions (action: Action): Node {
    const node = new Node(action)
    const preconditionActions = []
    for(let pc of action.preconditions) {
      preconditionActions.push(...this.actions.filter(action => action.goal === pc))
    }
    const newNodes = preconditionActions.map(pc => this.findPreconditions(pc))
    node.addChildren(...newNodes)
    return node
  }

  private constructGraph (goal: string): Node {
    const node = new Node(new EmptyRootAction())
    const preconditions = this.actions.map(ac => ac.goal === goal && this.findPreconditions(ac)).filter(Boolean)
    node.addChildren(...preconditions)
    return node
  }

  public updateCosts (goal: string, world: World, actor: Mob) {
    let graph = this.plans[goal]
    if (!graph) graph = this.plans[goal] = this.constructGraph(goal)
    graph.updateCost(world, actor)
  }

  public getPlan (goal: string, world: World, actor: Mob) {
    this.updateCosts(goal, world, actor)
    let graph = this.plans[goal]
    const actions = graph.children
    let lowestCost = Infinity
    let lowestAction = null
    for (let action of actions) {
      if (action.cost < lowestCost) {
        lowestAction = action
        lowestCost = action.cost
      }
    }
    const plan = lowestAction.getLowestCostChildren(world, actor).map(node => node.action)
    // console.log(plan)
    // console.log(graph)
    return plan
  }
}
