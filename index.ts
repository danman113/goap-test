import { LabeledStatic, World, Person } from './entity';
import * as actions from './goap'
import { v2 } from './math/v2'
import { rand } from './math/random';

const canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('canvas')

const world = new World(canvas)

const box = new LabeledStatic({
  position: v2(40, 40),
  dimensions: v2(100, 100),
  fontSize: 20,
  name: 'Food Box',
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
  name: 'Stall',
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
  new actions.ConsumeItem(5, 'food'),
  new actions.ConsumeItem(1, 'water'),
  new actions.Sleep(10),
  new actions.Survive(5)
])

const bo = new Person({
  position: v2(100, 200),
  color: 'blue',
  name: 'Bobo',
  planner
})

bo.state.money = 1

// const cotton = new Person({
//   position: v2(rand(1, 10000), rand(1, 10000)),
//   color: 'red',
//   name: 'Cotton',
//   planner
// })

world.pushObj(box, box2, bed, stall)
world.pushMob(bo)


console.log(world)

world.run()
