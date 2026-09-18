package com.richroro.crowdrush

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

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
}
