import { LabeledStatic, World, Person, Living } from './entity'
import * as actions from './goap'
import { v2 } from './math/v2'
import { rand } from './math/util'

const canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('canvas')

const world = new World(canvas)

const box = new LabeledStatic({
  position: v2(40, 40),
  dimensions: v2(100, 100),
  fontSize: 20,
  name: 'Food Stall',
  tag: 'food'
})

const box2 = new LabeledStatic({
  position: v2(400, 400),
  dimensions: v2(100, 100),
  fontSize: 20,
  name: 'Well',
  tag: 'water'
})

const bed = new LabeledStatic({
  position: v2(100, 400),
  dimensions: v2(100, 100),
  fontSize: 20,
  name: 'Bed',
  tag: 'sleep'
})

const stall = new LabeledStatic({
  position: v2(400, 100),
  dimensions: v2(100, 100),
  fontSize: 20,
  name: 'General Stall',
  tag: 'sell'
})

const planner = new actions.GOAPPlanner([
  new actions.MoveToTag(world, 'food'),
  new actions.MoveToTag(world, 'sell'),
  new actions.MoveToTag(world, 'water'),
  new actions.MoveToTag(world, 'sleep'),
  new actions.PickupFood(2),
  new actions.PickupWater(10),
  new actions.SellWater(5),
  new actions.EatDirt(),
  new actions.ConsumeItem(5, 'food', (world: World, mob: Living) => mob.addHunger(50000)),
  new actions.ConsumeItem(1, 'water', (world: World, mob: Living) => mob.addThirst(100000)),
  new actions.Sleep(10),
  new actions.NeedsWater(),
  new actions.NeedsFood(),
  new actions.NeedsSleep(),
  new actions.Relax(),
])

const bo = new Person({
  position: v2(100, 200),
  color: 'blue',
  name: 'Bobo',
  planner
})

bo.state.money = 1

const cotton = new Person({
  position: v2(rand(1, 10000), rand(1, 10000)),
  color: 'red',
  name: 'Cotton',
  planner
})

world.pushObj(box, box2, bed, stall)
world.pushMob(bo, cotton)

for(let i = 0; i < 20; i++) {
  const cotton = new Person({
    position: v2(rand(-3000, 3000), rand(-3000, 3000)),
    color: 'red',
    name: `Bot + ${i}`,
    planner
  })
  world.pushMob(cotton)
}

console.log(world)

world.run()
