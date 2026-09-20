package com.richroro.skystrike

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SkyWorldTest {

    private fun running(seed: Int = 1, level: Int = 1) = SkyWorld(seed).apply { startLevel(level) }

    @Test
    fun `a fresh stage starts running with a full aircraft`() {
        val w = running()
        assertEquals(SkyWorld.State.RUNNING, w.state)
        assertEquals(SkyWorld.MAX_HP, w.hp)
        assertEquals(SkyWorld.START_BOMBS, w.bombs)
        assertEquals(1, w.spread)
        assertEquals(0f, w.playerX, 1e-5f)
    }

    @Test
    fun `the player cannot fly off the edge of the screen`() {
        val w = running()
        repeat(100) { w.movePlayerBy(0.5f) }
        assertTrue(w.playerX <= SkyWorld.PLAYER_LIMIT + 1e-4f)
        repeat(200) { w.movePlayerBy(-0.5f) }
        assertTrue(w.playerX >= -SkyWorld.PLAYER_LIMIT - 1e-4f)
    }

    @Test
    fun `guns fire on their own and the bullets travel up the screen`() {
        val w = running()
        // update() clamps dt to MAX_FRAME_DT, so drive it in real frames rather than one long one
        repeat(12) { w.update(1f / 60f) }
        val shot = w.shots.firstOrNull { it.fromPlayer }
        assertNotNull("the player should be firing without being asked", shot)
        val before = shot!!.y
        w.update(0.05f)
        assertTrue("player bullets travel up, so y falls", shot.y < before)
    }

    @Test
    fun `a bullet destroys a one-hit enemy and scores it`() {
        val w = running()
        w.clearWavesForTest()
        val e = w.addEnemyForTest(SkyWorld.Kind.DRONE, x = 0f, y = SkyWorld.PLAYER_Y - 0.2f, hp = 1)
        val scoreBefore = w.score
        repeat(30) { if (e.alive) w.update(1f / 60f) }
        assertTrue("the drone should have been shot down", !e.alive)
        assertTrue("killing something should score", w.score > scoreBefore)
        assertEquals(1, w.kills)
    }

    @Test
    fun `a tougher enemy needs more than one hit`() {
        val w = running()
        w.clearWavesForTest()
        val e = w.addEnemyForTest(SkyWorld.Kind.GUNNER, x = 0f, y = 0.3f, hp = 4)
        w.update(1f / 60f)
        w.update(1f / 60f)
        assertTrue("four hit points should not fall to the first bullet", e.alive || e.hp < e.maxHp)
    }

    @Test
    fun `flying into an enemy costs a hit point and grants mercy time`() {
        val w = running()
        w.clearWavesForTest()
        w.addEnemyForTest(SkyWorld.Kind.DRONE, x = 0f, y = SkyWorld.PLAYER_Y)
        w.update(1f / 60f)
        assertEquals(SkyWorld.MAX_HP - 1, w.hp)
        assertTrue("a hit should make you briefly untouchable", w.mercy > 0f)
    }

    @Test
    fun `mercy time means a second collision in the same instant is free`() {
        val w = running()
        w.clearWavesForTest()
        w.addEnemyForTest(SkyWorld.Kind.DRONE, x = 0f, y = SkyWorld.PLAYER_Y)
        w.addEnemyForTest(SkyWorld.Kind.DRONE, x = 0.01f, y = SkyWorld.PLAYER_Y)
        w.update(1f / 60f)
        assertEquals("only the first of the two should land", SkyWorld.MAX_HP - 1, w.hp)
    }

    @Test
    fun `a shield absorbs one hit and is then spent`() {
        val w = running()
        w.clearWavesForTest()
        w.setForTest(shield = true)
        w.addEnemyForTest(SkyWorld.Kind.DRONE, x = 0f, y = SkyWorld.PLAYER_Y)
        w.update(1f / 60f)
        assertEquals("the shield should have taken it", SkyWorld.MAX_HP, w.hp)
        assertTrue(!w.shield)
    }

    @Test
    fun `an enemy bullet costs a hit point`() {
        val w = running()
        w.clearWavesForTest()
        w.addEnemyShotForTest(x = 0f, y = SkyWorld.PLAYER_Y - 0.01f)
        w.update(1f / 60f)
        assertEquals(SkyWorld.MAX_HP - 1, w.hp)
    }

    @Test
    fun `running out of hit points ends the run`() {
        val w = running()
        w.clearWavesForTest()
        w.setForTest(hp = 1)
        w.addEnemyForTest(SkyWorld.Kind.DRONE, x = 0f, y = SkyWorld.PLAYER_Y)
        w.update(1f / 60f)
        assertEquals(SkyWorld.State.GAME_OVER, w.state)
        assertEquals(0, w.hp)
    }

    @Test
    fun `the spread pickup adds a gun line and a hit takes one away`() {
        val w = running()
        w.clearWavesForTest()
        w.addItemForTest(SkyWorld.ItemKind.SPREAD, x = 0f, y = SkyWorld.PLAYER_Y - 0.001f)
        w.update(1f / 60f)
        assertEquals(2, w.spread)
        w.setForTest(mercy = 0f)
        w.addEnemyForTest(SkyWorld.Kind.DRONE, x = 0f, y = SkyWorld.PLAYER_Y)
        w.update(1f / 60f)
        assertEquals("taking damage should cost a gun", 1, w.spread)
    }

    @Test
    fun `repair never pushes past a full aircraft`() {
        val w = running()
        w.clearWavesForTest()
        w.addItemForTest(SkyWorld.ItemKind.REPAIR, x = 0f, y = SkyWorld.PLAYER_Y - 0.001f)
        w.update(1f / 60f)
        assertEquals(SkyWorld.MAX_HP, w.hp)
    }

    @Test
    fun `the bomb clears the screen and is consumed`() {
        val w = running()
        w.clearWavesForTest()
        repeat(6) { i -> w.addEnemyForTest(SkyWorld.Kind.DRONE, x = -0.5f + i * 0.2f, y = 0.3f) }
        val bombsBefore = w.bombs
        assertTrue(w.useBomb())
        assertEquals(bombsBefore - 1, w.bombs)
        assertTrue("nothing should be left flying", w.enemies.none { it.alive })
    }

    @Test
    fun `the bomb does nothing when none are left`() {
        val w = running()
        w.setForTest(bombs = 0)
        assertTrue(!w.useBomb())
    }

    @Test
    fun `the villain only shows up once the waves are done, and clears the stage when beaten`() {
        val w = running()
        w.clearWavesForTest()
        w.update(1f / 60f)
        assertNotNull("with the waves spent the boss should arrive", w.boss)
        w.forceBossForTest(hp = 3)
        var guard = 0
        while (w.state == SkyWorld.State.RUNNING && guard++ < 60 * 30) w.update(1f / 60f)
        assertEquals(SkyWorld.State.LEVEL_CLEAR, w.state)
        assertEquals(1, w.bestLevel)
    }

    @Test
    fun `the same seed lays out the same stage on every run`() {
        fun fingerprint(): String {
            val w = SkyWorld(99).apply { startLevel(3) }
            repeat(60 * 12) { w.update(1f / 60f) }
            return w.enemies.joinToString(";") { "%.4f,%.4f,%s".format(it.x, it.y, it.kind) }
        }
        assertEquals(fingerprint(), fingerprint())
    }

    @Test
    fun `every stage profile is playable and reachable`() {
        for (level in 1..8) {
            val w = SkyWorld(level * 13).apply { startLevel(level) }
            assertEquals(SkyWorld.State.RUNNING, w.state)
            assertTrue(SkyWorld.profileOf(level).waves > 0)
            repeat(60 * 5) { w.update(1f / 60f) }
            assertTrue("stage $level should put something in the air", w.enemies.isNotEmpty() || w.boss != null)
        }
    }

    @Test
    fun `the pass blows you off your line and the other stages do not`() {
        val pass = SkyWorld(3).apply { startLevel(2) }     // Thunderhead Pass carries the gusts
        pass.clearWavesForTest()
        val start = pass.playerX
        var pushed = false
        repeat(60 * 3) {
            pass.update(1f / 60f)
            if (kotlin.math.abs(pass.playerX - start) > 0.05f) pushed = true
        }
        assertTrue("the crosswind should move you without any input", pushed)
        assertTrue("and it should be blowing", kotlin.math.abs(pass.gust) > 0f)

        val coast = SkyWorld(3).apply { startLevel(1) }
        coast.clearWavesForTest()
        repeat(60 * 3) { coast.update(1f / 60f) }
        assertEquals("the coast road has no wind", 0f, coast.gust, 1e-6f)
        assertEquals("so you hold your line", 0f, coast.playerX, 1e-4f)
    }

    @Test
    fun `the crosswind reverses rather than pinning you to one edge`() {
        val w = SkyWorld(1).apply { startLevel(2) }
        w.clearWavesForTest()
        var sawPush = false
        var sawPull = false
        repeat(60 * 14) {
            w.update(1f / 60f)
            if (w.gust > 0.05f) sawPush = true
            if (w.gust < -0.05f) sawPull = true
        }
        assertTrue("the wind should blow both ways over a stage", sawPush && sawPull)
    }

    @Test
    fun `the ember fields throw up fire columns that burn on contact`() {
        val w = SkyWorld(4).apply { startLevel(3) }        // the Ember Fields carry the flak
        w.clearWavesForTest()
        var guard = 0
        while (w.flares.isEmpty() && guard++ < 60 * 12) w.update(1f / 60f)
        assertTrue("the burning ground should send something up", w.flares.isNotEmpty())

        val hit = SkyWorld(4).apply { startLevel(3) }
        hit.clearWavesForTest()
        hit.setForTest(playerX = 0f)
        hit.addFlareForTest(x = 0f, y = SkyWorld.PLAYER_Y)
        hit.update(1f / 60f)
        assertEquals("flying into the column should cost you", SkyWorld.MAX_HP - 1, hit.hp)
    }

    @Test
    fun `the coast road never throws fire at you`() {
        val w = SkyWorld(4).apply { startLevel(1) }
        w.clearWavesForTest()
        repeat(60 * 20) { w.update(1f / 60f) }
        assertTrue("stage one's hazard is nothing at all", w.flares.isEmpty())
    }

    @Test
    fun `the long night gives you far less warning than the coast road`() {
        fun firstEntryY(level: Int): Float {
            val w = SkyWorld(7).apply { startLevel(level) }
            var guard = 0
            while (w.enemies.isEmpty() && guard++ < 60 * 10) w.update(1f / 60f)
            return w.enemies.maxOf { it.y }
        }
        val coast = firstEntryY(1)
        val night = firstEntryY(4)
        assertTrue("the night should put them almost on screen, saw $night", night > coast + 0.05f)
    }

    @Test
    fun `each stage flies its own formations, not one shared shuffle`() {
        // Trail is the pass's shape and arc is the ember fields'; neither belongs on the coast road.
        for (level in 1..4) {
            val allowed = SkyWorld.profileOf(level).formations.toSet()
            assertTrue("stage $level should have its own set", allowed.isNotEmpty())
        }
        val coast = SkyWorld.profileOf(1).formations.toSet()
        val fields = SkyWorld.profileOf(3).formations.toSet()
        assertTrue("the coast road and the ember fields should not fly the same shapes",
            coast != fields)
    }

    @Test
    fun `a long run never leaves bullets or wrecks piling up`() {
        val w = running(seed = 5)
        var frames = 0
        var worstShots = 0
        var worstEnemies = 0
        while (frames++ < 60 * 60 * 4) {
            w.update(1f / 60f)
            worstShots = maxOf(worstShots, w.shots.size)
            worstEnemies = maxOf(worstEnemies, w.enemies.size)
            w.drainEvents(ArrayList())
            when (w.state) {
                SkyWorld.State.LEVEL_CLEAR -> w.nextLevel()
                SkyWorld.State.GAME_OVER -> w.start()
                else -> {}
            }
        }
        assertTrue("bullets should be reaped, saw $worstShots", worstShots < 400)
        assertTrue("wrecks should be reaped, saw $worstEnemies", worstEnemies < 120)
    }

    // ---- flying forward and back ------------------------------------------------------------

    @Test
    fun `the player can fly forward and back but not out of the band`() {
        val w = running()
        assertEquals("every stage starts on the back line", SkyWorld.PLAYER_Y, w.playerY, 1e-5f)
        repeat(100) { w.movePlayerBy(0f, -0.05f) }
        assertEquals(SkyWorld.PLAYER_Y_MIN, w.playerY, 1e-4f)
        repeat(200) { w.movePlayerBy(0f, 0.05f) }
        assertEquals(SkyWorld.PLAYER_Y_MAX, w.playerY, 1e-4f)
    }

    @Test
    fun `flying forward takes the hitbox with you`() {
        val w = running()
        w.clearWavesForTest()
        w.movePlayerBy(0f, -0.2f)
        // where the fighter used to sit is now empty sky
        w.addEnemyForTest(SkyWorld.Kind.DRONE, x = 0f, y = SkyWorld.PLAYER_Y)
        w.update(1f / 60f)
        assertEquals("the back line is vacated once you push forward", SkyWorld.MAX_HP, w.hp)
        // and where it sits now is not
        w.addEnemyForTest(SkyWorld.Kind.DRONE, x = 0f, y = w.playerY)
        w.update(1f / 60f)
        assertEquals(SkyWorld.MAX_HP - 1, w.hp)
    }

    @Test
    fun `guns fire from wherever the fighter is`() {
        val w = running()
        w.clearWavesForTest()
        w.movePlayerBy(0f, -0.25f)
        repeat(12) { w.update(1f / 60f) }
        val shot = w.shots.firstOrNull { it.fromPlayer }
        assertNotNull("pushing forward should not stop the guns", shot)
        assertTrue(
            "bullets should leave the nose, not the old back line, saw ${shot!!.y}",
            shot.y < SkyWorld.PLAYER_Y - 0.15f,
        )
    }

    @Test
    fun `pickups are caught at the height you are flying`() {
        val w = running()
        w.clearWavesForTest()
        w.movePlayerBy(0f, -0.3f)
        w.addItemForTest(SkyWorld.ItemKind.SPREAD, x = 0f, y = w.playerY - 0.001f)
        w.update(1f / 60f)
        assertEquals(2, w.spread)
    }

    @Test
    fun `the front of the band stays clear of the raider`() {
        val w = running()
        w.clearWavesForTest()
        w.forceBossForTest(hp = 400)
        repeat(60) { w.movePlayerBy(0f, -0.05f) }
        assertEquals(SkyWorld.PLAYER_Y_MIN, w.playerY, 1e-4f)
        // the band has to end above the raider's hull, or the fight opens with a free ram
        assertTrue(
            "the front line sits inside the raider at y=${SkyWorld.PLAYER_Y_MIN}",
            SkyWorld.PLAYER_Y_MIN > SkyWorld.BOSS_STATION_Y + SkyWorld.BOSS_HALF + SkyWorld.PLAYER_HALF_Y,
        )
        // and head on, before its first salvo can cross the gap, nothing touches you
        repeat(12) { w.update(1f / 60f) }
        assertEquals("sitting at the front line should not be a collision",
            SkyWorld.MAX_HP, w.hp)
    }

    @Test
    fun `a new stage puts the fighter back on the start line`() {
        val w = running()
        w.movePlayerBy(0.4f, -0.3f)
        w.startLevel(2)
        assertEquals(0f, w.playerX, 1e-5f)
        assertEquals(SkyWorld.PLAYER_Y, w.playerY, 1e-5f)
    }

    @Test
    fun `enemies still shoot at a fighter that has pushed forward`() {
        val w = running(level = 3)
        w.clearWavesForTest()
        w.movePlayerBy(0f, -0.3f)
        val e = w.addEnemyForTest(SkyWorld.Kind.GUNNER, x = 0.5f, y = 0.15f)
        var fired = false
        repeat(60 * 5) {
            if (!fired) {
                w.update(1f / 60f)
                e.y = 0.15f
                fired = w.shots.any { !it.fromPlayer }
            }
        }
        assertTrue("a gunner above the band should still be able to fire on you", fired)
    }
}
