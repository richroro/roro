package com.richroro.skydodge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

class GameWorldTest {

    private fun newWorld(): GameWorld = GameWorld(Random(42)).apply { setAspect(2f) }

    @Test
    fun `starts in READY and does not advance until started`() {
        val world = newWorld()
        assertEquals(GameWorld.State.READY, world.state)
        world.update(1f)
        assertEquals(0f, world.elapsed, 0f)
        assertTrue(world.entities.isEmpty())
    }

    @Test
    fun `score grows with survival time`() {
        val world = newWorld()
        world.start()
        repeat(40) { world.update(0.05f) } // 2 seconds
        assertEquals(2f, world.elapsed, 1e-3f)
        assertEquals(20, world.score)
    }

    @Test
    fun `player movement is clamped to the playfield`() {
        val world = newWorld()
        world.start()
        world.movePlayerBy(-10f)
        assertEquals(GameWorld.PLAYER_RADIUS, world.playerX, 1e-6f)
        world.movePlayerBy(10f)
        assertEquals(1f - GameWorld.PLAYER_RADIUS, world.playerX, 1e-6f)
    }

    @Test
    fun `hitting a block ends the game`() {
        val world = newWorld()
        world.start()
        world.addEntityForTest(
            GameWorld.Entity(
                kind = GameWorld.Kind.BLOCK,
                x = world.playerX,
                y = world.playerY - 0.2f,
                width = 0.2f,
                height = GameWorld.BLOCK_HEIGHT,
                fallSpeed = 1f,
                spin = 0f,
            ),
        )
        repeat(10) { world.update(0.05f) } // block travels 0.5 units, straight through the player
        assertEquals(GameWorld.State.GAME_OVER, world.state)
    }

    @Test
    fun `catching a star awards points and removes it`() {
        val world = newWorld()
        world.start()
        world.addEntityForTest(
            GameWorld.Entity(
                kind = GameWorld.Kind.STAR,
                x = world.playerX,
                y = world.playerY - 0.1f,
                width = GameWorld.STAR_SIZE,
                height = GameWorld.STAR_SIZE,
                fallSpeed = 1f,
                spin = 0f,
            ),
        )
        world.update(0.05f)
        world.update(0.05f)
        assertEquals(1, world.starsCollected)
        assertEquals(GameWorld.State.PLAYING, world.state)
        assertTrue(world.entities.none { it.kind == GameWorld.Kind.STAR && it.y < world.playerY })
        assertEquals(GameWorld.STAR_POINTS + 1, world.score)
    }

    @Test
    fun `pause freezes the simulation and resume continues it`() {
        val world = newWorld()
        world.start()
        world.update(0.05f)
        world.pause()
        assertEquals(GameWorld.State.PAUSED, world.state)
        world.update(0.05f)
        assertEquals(0.05f, world.elapsed, 1e-6f)
        world.resume()
        world.update(0.05f)
        assertEquals(0.1f, world.elapsed, 1e-6f)
    }

    @Test
    fun `difficulty ramps up over time but stays bounded`() {
        val world = GameWorld(Random(7)).apply { setAspect(3f) } // tall field: nothing can reach the player in 3s
        world.start()
        val initialSpeed = world.fallSpeed
        val initialInterval = world.spawnInterval
        repeat(60) { world.update(0.05f) } // 3 seconds
        assertEquals(GameWorld.State.PLAYING, world.state)
        assertTrue(world.fallSpeed > initialSpeed)
        assertTrue(world.spawnInterval < initialInterval)
        assertTrue(world.fallSpeed <= GameWorld.MAX_FALL_SPEED)
        assertTrue(world.spawnInterval >= GameWorld.MIN_SPAWN_INTERVAL)
        assertTrue(world.entities.isNotEmpty())
    }

    @Test
    fun `entities that fall off screen are removed`() {
        val world = newWorld()
        world.start()
        world.movePlayerBy(-1f) // hug the left edge
        world.addEntityForTest(
            GameWorld.Entity(
                kind = GameWorld.Kind.BLOCK,
                x = 0.9f,
                y = world.height - 0.01f,
                width = 0.1f,
                height = GameWorld.BLOCK_HEIGHT,
                fallSpeed = 2f,
                spin = 0f,
            ),
        )
        world.update(0.05f)
        assertTrue(world.entities.none { it.x == 0.9f })
    }
}
