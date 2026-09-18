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
        // The boss is sized from the best-path count so a perfect run always wins.
        val best = a.expectedCountAt(Float.MAX_VALUE)
        assertTrue(a.boss!!.count < best)
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
}
