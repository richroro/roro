package com.richroro.crowdrush

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs

class CrowdWorldTest {

    @Test
    fun `gate arithmetic never drops below zero`() {
        assertEquals(7, CrowdWorld.apply(5, CrowdWorld.GateSide(CrowdWorld.Op.ADD, 2)))
        assertEquals(10, CrowdWorld.apply(5, CrowdWorld.GateSide(CrowdWorld.Op.MUL, 2)))
        assertEquals(0, CrowdWorld.apply(5, CrowdWorld.GateSide(CrowdWorld.Op.SUB, 9)))
        assertEquals(2, CrowdWorld.apply(5, CrowdWorld.GateSide(CrowdWorld.Op.DIV, 2)))
    }

    @Test
    fun `level generation is deterministic per seed and beatable on the best path`() {
        val a = CrowdWorld(seed = 42).apply { start() }
        val b = CrowdWorld(seed = 42).apply { start() }
        assertEquals(a.gates.map { it.z to it.left.label + it.right.label }, b.gates.map { it.z to it.left.label + it.right.label })
        assertEquals(a.boss!!.count, b.boss!!.count)
        assertTrue(a.gates.isNotEmpty())
        // The boss is sized from the best-path count plus roughly half the shots a best-path army lands.
        val best = a.expectedCountAt(Float.MAX_VALUE)
        val shots = CrowdWorld.fireRateFor(best) * (CrowdWorld.BULLET_RANGE / a.speed)
        assertTrue(a.boss!!.count <= best * CrowdWorld.BOSS_FACTOR + shots * CrowdWorld.BOSS_SHOOT_FACTOR)
        // Every gate offers exactly one "good" side.
        assertTrue(a.gates.all { it.left.isGood != it.right.isGood || (it.left.isGood && it.right.isGood) })
    }

    @Test
    fun `passing a gate applies the side the crowd is on`() {
        val world = CrowdWorld(seed = 7).apply { start() }
        val gate = world.gates.first()
        val goodOnLeft = gate.left.isGood
        world.setForTest(count = 3, playerX = if (goodOnLeft) -0.5f else 0.5f, z = gate.z - 0.1f)
        world.update(0.05f) // speed >= 6 m/s so 0.05 s covers 0.3 m
        assertTrue(gate.used)
        val good = if (goodOnLeft) gate.left else gate.right
        assertEquals(CrowdWorld.apply(3, good), world.count)
        assertEquals(CrowdWorld.State.RUNNING, world.state)
    }

    @Test
    fun `hitting a bigger enemy squad ends the run`() {
        val world = CrowdWorld(seed = 3).apply { start() }
        val enemy = world.enemies.first()
        world.setForTest(count = 1, playerX = enemy.x, z = enemy.z - 0.1f)
        world.update(0.05f)
        assertEquals(CrowdWorld.State.GAME_OVER, world.state)
        assertEquals(0, world.count)
        assertTrue(world.message.startsWith("squad:"))
    }

    @Test
    fun `dodging an enemy squad leaves it alive`() {
        val world = CrowdWorld(seed = 3).apply { start() }
        val enemy = world.enemies.first()
        val farSide = if (enemy.x < 0f) 0.8f else -0.8f
        world.setForTest(count = 1, playerX = farSide, z = enemy.z - 0.1f)
        world.update(0.05f)
        assertTrue(enemy.alive)
        assertEquals(CrowdWorld.State.RUNNING, world.state)
    }

    @Test
    fun `beating the boss clears the level and next level is harder`() {
        val world = CrowdWorld(seed = 11).apply { start() }
        val boss = world.boss!!
        world.setForTest(count = boss.count + 5, playerX = 0f, z = boss.z - 0.1f)
        world.update(0.05f)
        assertEquals(CrowdWorld.State.LEVEL_CLEAR, world.state)
        assertEquals(5, world.count)
        assertEquals(1, world.bestLevel)
        val firstLength = world.length
        val firstSpeed = world.speed
        world.nextLevel()
        assertEquals(2, world.level)
        assertTrue(world.length > firstLength)
        assertTrue(world.speed > firstSpeed)
        assertEquals(CrowdWorld.State.RUNNING, world.state)
    }

    @Test
    fun `losing to the boss ends the run`() {
        val world = CrowdWorld(seed = 11).apply { start() }
        val boss = world.boss!!
        world.setForTest(count = boss.count - 1, playerX = 0f, z = boss.z - 0.1f)
        world.update(0.05f)
        assertEquals(CrowdWorld.State.GAME_OVER, world.state)
        assertEquals(0, world.count)
    }

    @Test
    fun `player stays inside the lane and grows with the crowd`() {
        val world = CrowdWorld(seed = 1).apply { start() }
        world.movePlayerBy(-5f)
        assertEquals(-(CrowdWorld.LANE_HALF - world.playerRadius), world.playerX, 1e-6f)
        val smallRadius = world.playerRadius
        world.setForTest(count = 400, playerX = 0f, z = 0f)
        assertTrue(world.playerRadius > smallRadius)
        assertTrue(world.playerRadius <= CrowdWorld.PLAYER_MAX_RADIUS)
    }

    @Test
    fun `the crowd fires bullets while running and more soldiers fire faster`() {
        val world = CrowdWorld(seed = 5).apply { start() }
        world.update(0.05f)
        assertTrue(world.bullets.isEmpty()) // 1 soldier fires 1.2 shots per second, nothing yet after 50 ms
        repeat(20) { world.update(0.05f) } // 1 second
        assertTrue(world.bullets.isNotEmpty())
        assertEquals(CrowdWorld.SHOTS_PER_SHOOTER, CrowdWorld.fireRateFor(1), 1e-6f)
        assertEquals(CrowdWorld.MAX_SHOOTERS * CrowdWorld.SHOTS_PER_SHOOTER, CrowdWorld.fireRateFor(1000), 1e-6f)
    }

    @Test
    fun `bullets raise a plus gate and flip a minus gate`() {
        val plus = CrowdWorld.GateSide(CrowdWorld.Op.ADD, 2)
        repeat(CrowdWorld.GATE_HITS_PER_STEP) { plus.hit() }
        assertEquals(3, plus.value)

        val minus = CrowdWorld.GateSide(CrowdWorld.Op.SUB, 1)
        repeat(CrowdWorld.GATE_HITS_PER_STEP) { minus.hit() }
        assertEquals(CrowdWorld.Op.ADD, minus.op)
        assertEquals(1, minus.value)
        assertTrue(minus.isGood)

        val div = CrowdWorld.GateSide(CrowdWorld.Op.DIV, 2)
        repeat(CrowdWorld.DIV_HITS_TO_FLIP) { div.hit() }
        assertEquals(CrowdWorld.Op.ADD, div.op)
    }

    @Test
    fun `a bullet crossing a gate hits the side it is on`() {
        val world = CrowdWorld(seed = 9).apply { start() }
        val gate = world.gates.first()
        val before = gate.left.hits
        world.setForTest(count = 1, playerX = 0f, z = gate.z - 30f) // far enough that no gate is crossed by the crowd
        world.addBulletForTest(x = -0.5f, z = gate.z - 0.5f)
        world.update(0.05f) // bullet travels 1.4 m
        assertEquals(before + 1, gate.left.hits)
        assertEquals(0, gate.right.hits)
    }

    @Test
    fun `bullets thin out an enemy squad and kill it at zero`() {
        val world = CrowdWorld(seed = 9).apply { start() }
        val enemy = world.enemies.first()
        world.setForTest(count = 1, playerX = 0f, z = enemy.z - 30f)
        val n = enemy.count
        repeat(n) { world.addBulletForTest(x = enemy.x, z = enemy.z - 0.5f) }
        world.update(0.05f)
        assertEquals(0, enemy.count)
        assertTrue(!enemy.alive)
        assertEquals(n, world.kills)
    }

    @Test
    fun `shooting the boss down to zero clears the level without losing troops`() {
        val world = CrowdWorld(seed = 13).apply { start() }
        val boss = world.boss!!
        world.setForTest(count = 2, playerX = 0f, z = boss.z - 3f)
        repeat(boss.count) { world.addBulletForTest(x = 0f, z = boss.z - 0.5f) }
        world.update(0.05f) // bullets land; crowd moves only 0.3 m
        assertEquals(0, boss.count)
        assertTrue(!boss.alive)
        world.setForTest(count = 2, playerX = 0f, z = boss.z - 0.1f)
        world.update(0.05f)
        assertEquals(CrowdWorld.State.LEVEL_CLEAR, world.state)
        assertEquals(2, world.count)
    }

    @Test
    fun `events are queued for shots and gate passes and drained once`() {
        val world = CrowdWorld(seed = 5).apply { start() }
        repeat(20) { world.update(0.05f) } // 1 second: at least one shot
        val drained = ArrayList<CrowdWorld.Event>()
        world.drainEvents(drained)
        assertTrue(drained.any { it.type == CrowdWorld.Event.Type.SHOT })
        val again = ArrayList<CrowdWorld.Event>()
        world.drainEvents(again)
        assertTrue(again.isEmpty())

        val gate = world.gates.first()
        world.setForTest(count = 3, playerX = if (gate.left.isGood) -0.5f else 0.5f, z = gate.z - 0.1f)
        world.update(0.05f)
        val afterGate = ArrayList<CrowdWorld.Event>()
        world.drainEvents(afterGate)
        assertTrue(afterGate.any { it.type == CrowdWorld.Event.Type.GATE_GOOD })
    }

    @Test
    fun `gate hit reports whether the number changed`() {
        val side = CrowdWorld.GateSide(CrowdWorld.Op.ADD, 1)
        val results = (1..CrowdWorld.GATE_HITS_PER_STEP).map { side.hit() }
        assertEquals(CrowdWorld.GATE_HITS_PER_STEP - 1, results.count { !it })
        assertTrue(results.last())
    }

    @Test
    fun `enemy squads stay clear of gates and inside the lane`() {
        for (seed in 1..30) {
            val world = CrowdWorld(seed = seed).apply { start() }
            for (e in world.enemies) {
                assertTrue("seed $seed enemy at ${e.z} too close to a gate", world.gates.all { abs(it.z - e.z) >= CrowdWorld.ENEMY_GATE_CLEARANCE - 1e-3f })
                assertTrue(e.z >= CrowdWorld.LANE_MIN_Z && e.z <= world.length - 12f)
                assertTrue(abs(e.x) + CrowdWorld.ENEMY_HALF_WIDTH <= CrowdWorld.LANE_HALF + 0.05f)
                assertTrue(e.count >= CrowdWorld.MIN_ENEMY)
            }
        }
    }

    @Test
    fun `enemy squads march toward the player once in range`() {
        val world = CrowdWorld(seed = 4).apply { start() }
        val enemy = world.enemies.first()
        val startZ = enemy.z
        world.setForTest(count = 1, playerX = 0.9f, z = enemy.z - CrowdWorld.ENEMY_MARCH_RANGE + 1f)
        world.update(0.05f)
        assertEquals(startZ - CrowdWorld.ENEMY_MARCH_SPEED * 0.05f, enemy.z, 1e-4f)
    }

    private fun pickUp(world: CrowdWorld, kind: CrowdWorld.ItemKind, count: Int): CrowdWorld.Item {
        val z = 60f
        val item = world.addItemForTest(kind, x = 0f, z = z)
        world.setForTest(count = count, playerX = 0f, z = z - 0.1f)
        world.update(0.05f)
        assertTrue(!item.alive)
        return item
    }

    @Test
    fun `rapid fire doubles the fire rate for a while`() {
        val world = CrowdWorld(seed = 21).apply { start() }
        pickUp(world, CrowdWorld.ItemKind.RAPID, count = 10)
        assertEquals(CrowdWorld.fireRateFor(10) * CrowdWorld.RAPID_MULT, world.fireRate, 1e-4f)
        assertTrue(world.rapidTimer > 0f)
        // Hold the crowd short of the first gate so nothing can end the run while the timer drains.
        repeat(140) { // 7 seconds
            world.setForTest(count = 10, playerX = 0f, z = 5f)
            world.update(0.05f)
        }
        assertEquals(0f, world.rapidTimer, 0f)
        assertEquals(CrowdWorld.fireRateFor(10), world.fireRate, 1e-4f)
    }

    @Test
    fun `reinforcements add at least three soldiers`() {
        val world = CrowdWorld(seed = 21).apply { start() }
        pickUp(world, CrowdWorld.ItemKind.REINFORCE, count = 4)
        assertEquals(7, world.count)
        val big = CrowdWorld(seed = 22).apply { start() }
        pickUp(big, CrowdWorld.ItemKind.REINFORCE, count = 100)
        assertEquals(130, big.count)
    }

    @Test
    fun `shield absorbs one squad contact and destroys the squad`() {
        val world = CrowdWorld(seed = 21).apply { start() }
        pickUp(world, CrowdWorld.ItemKind.SHIELD, count = 1)
        assertTrue(world.shield)
        val enemy = world.enemies.first()
        world.setForTest(count = 1, playerX = enemy.x, z = enemy.z - 0.1f)
        world.update(0.05f)
        assertTrue(!enemy.alive)
        assertEquals(1, world.count)
        assertTrue(!world.shield)
        assertEquals(CrowdWorld.State.RUNNING, world.state)
    }

    @Test
    fun `bomb wipes squads in range and chips the boss`() {
        val world = CrowdWorld(seed = 21).apply { start() }
        val boss = world.boss!!
        world.setForTest(count = 5, playerX = 0f, z = boss.z - 30f)
        val item = world.addItemForTest(CrowdWorld.ItemKind.BOMB, x = 0f, z = boss.z - 29.9f)
        world.update(0.05f)
        assertTrue(!item.alive)
        assertTrue(world.enemies.filter { it.z - world.z < CrowdWorld.BOMB_RANGE }.none { it.alive })
        assertEquals(boss.maxCount - (boss.maxCount * CrowdWorld.BOMB_BOSS_RATIO).toInt(), boss.count)
    }

    @Test
    fun `items keep clear of gates and squads`() {
        for (seed in 1..30) {
            val world = CrowdWorld(seed = seed).apply { start() }
            assertTrue(world.items.isNotEmpty())
            for (item in world.items) {
                assertTrue(world.gates.all { abs(it.z - item.z) >= CrowdWorld.ITEM_CLEARANCE - 1e-3f })
                assertTrue(world.enemies.all { abs(it.z - item.z) >= CrowdWorld.ITEM_CLEARANCE - 1e-3f })
            }
        }
    }

    @Test
    fun `a different monster waits at the end of each level and it stomps toward the rangers`() {
        val world = CrowdWorld(seed = 8).apply { start() }
        val kinds = (1..CrowdWorld.MONSTER_KINDS + 1).map { world.startLevel(it); world.boss!!.kind }
        assertEquals((0 until CrowdWorld.MONSTER_KINDS).toList() + 0, kinds)

        world.startLevel(1)
        val boss = world.boss!!
        val startZ = boss.z
        world.setForTest(count = 1, playerX = 0f, z = boss.z - CrowdWorld.MONSTER_MARCH_RANGE - 5f)
        world.update(0.05f)
        assertEquals(startZ, boss.z, 0f) // out of range: stands still
        assertTrue(!boss.marching)
        world.setForTest(count = 1, playerX = 0f, z = boss.z - CrowdWorld.MONSTER_MARCH_RANGE + 1f)
        world.update(0.05f)
        assertEquals(startZ - CrowdWorld.MONSTER_MARCH_SPEED * 0.05f, boss.z, 1e-4f)
        assertTrue(boss.marching && boss.roared)
        val events = ArrayList<CrowdWorld.Event>()
        world.drainEvents(events)
        assertTrue(events.any { it.type == CrowdWorld.Event.Type.ROAR })
    }

    @Test
    fun `each stage is laid out differently`() {
        val world = CrowdWorld(seed = 31)
        val shapes = (1..CrowdWorld.PROFILES.size).map { level ->
            world.startLevel(level)
            Triple(world.gates.size, world.enemies.size, world.walls.size)
        }
        // the office is gate-heavy with no walls, the reunion and the flat put walls up,
        // the family dinner comes in waves
        assertEquals(0, shapes[0].third)
        assertTrue("office should be the gate-heaviest", shapes[0].first > shapes[2].first)
        assertTrue("family dinner should have the most squads", shapes[2].second > shapes[0].second)
        assertTrue("reunion and flat should put up walls", shapes[1].third > 0 && shapes[3].third > 0)
        assertEquals(shapes.size, shapes.distinct().size)
    }

    @Test
    fun `every stage names a mini villain squad`() {
        val world = CrowdWorld(seed = 17)
        for (level in 1..CrowdWorld.PROFILES.size) {
            world.startLevel(level)
            val elites = world.enemies.filter { it.elite }
            assertEquals("level $level", 1, elites.size)
            assertTrue(elites.first().count > CrowdWorld.MIN_ENEMY)
        }
    }

    @Test
    fun `bullets break a wall down and the bomb flattens it`() {
        val world = CrowdWorld(seed = 5).apply { startLevel(2) }
        val wall = world.walls.first()
        val hp = wall.hp
        world.setForTest(count = 10, playerX = wall.x, z = wall.z - 30f)
        repeat(hp) { world.addBulletForTest(x = wall.x, z = wall.z - 0.5f) }
        world.update(0.05f)
        assertEquals(0, wall.hp)
        assertTrue(!wall.alive)

        val other = CrowdWorld(seed = 5).apply { startLevel(2) }
        val target = other.walls.first()
        other.setForTest(count = 10, playerX = 0f, z = target.z - 20f)
        other.addItemForTest(CrowdWorld.ItemKind.BOMB, x = 0f, z = target.z - 19.9f)
        other.update(0.05f)
        assertTrue(!target.alive)
    }

    @Test
    fun `walking into a standing wall costs its remaining people, dodging it costs nothing`() {
        val hit = CrowdWorld(seed = 5).apply { startLevel(2) }
        val wall = hit.walls.first()
        val toll = wall.hp
        hit.setForTest(count = toll + 4, playerX = wall.x, z = wall.z - 0.1f)
        hit.update(0.05f)
        assertEquals(4, hit.count)
        assertTrue(!wall.alive)

        val dodge = CrowdWorld(seed = 5).apply { startLevel(2) }
        val other = dodge.walls.first()
        dodge.setForTest(count = 8, playerX = -other.x, z = other.z - 0.1f)
        dodge.update(0.05f)
        assertEquals(8, dodge.count)
        assertTrue(other.alive)
    }
}
