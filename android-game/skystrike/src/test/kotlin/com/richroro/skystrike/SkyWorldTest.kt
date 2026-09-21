package com.richroro.skystrike

import kotlin.math.abs
import kotlin.math.max
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

    // ---- the raider going down ----------------------------------------------------------------

    /** Shoots the stationed raider down and returns every event the run produced. */
    private fun downTheRaider(w: SkyWorld, seconds: Float = 0f): List<SkyWorld.Event> {
        val log = ArrayList<SkyWorld.Event>()
        w.clearWavesForTest()
        w.forceBossForTest(hp = 1)
        var frames = 0
        while (frames++ < 600 && w.boss?.alive == true) {
            w.update(1f / 60f)
            w.drainEvents(log)
        }
        assertTrue("the raider should have been shot down", w.boss?.alive == false)
        repeat((seconds * 60f).toInt()) { w.update(1f / 60f); w.drainEvents(log) }
        return log
    }

    @Test
    fun `killing the raider does not end the stage on the same frame`() {
        val w = running()
        downTheRaider(w)
        assertEquals("the clear panel must wait for the wreck", SkyWorld.State.RUNNING, w.state)
        assertTrue("the wreck should be coming apart", (w.boss?.dying ?: 0f) > 0f)
    }

    @Test
    fun `the wreck falls and rolls instead of vanishing`() {
        val w = running()
        downTheRaider(w)
        val b = w.boss!!
        val y0 = b.y
        val roll0 = b.roll
        repeat(30) { w.update(1f / 60f) }
        assertTrue("it should be falling, $y0 -> ${b.y}", b.y > y0)
        assertTrue("it should be rolling over", b.roll > roll0)
    }

    @Test
    fun `the hull comes apart in a run of blasts before the last one`() {
        val w = running()
        val log = downTheRaider(w, seconds = SkyWorld.BOSS_DEATH_SECONDS + 0.5f)
        val downs = log.count { it.type == SkyWorld.Event.Type.BOSS_DOWN }
        val breaks = log.count { it.type == SkyWorld.Event.Type.BOSS_BREAK }
        val finale = log.count { it.type == SkyWorld.Event.Type.KILL_BOSS }
        assertEquals("the kill should announce itself once", 1, downs)
        assertEquals("every blast in the run should fire", SkyWorld.BOSS_BREAKS, breaks)
        assertEquals("and exactly one of them is the last", 1, finale)
        val order = log.filter {
            it.type == SkyWorld.Event.Type.BOSS_DOWN || it.type == SkyWorld.Event.Type.KILL_BOSS
        }
        assertEquals(SkyWorld.Event.Type.BOSS_DOWN, order.first().type)
        assertEquals("the finale comes last", SkyWorld.Event.Type.KILL_BOSS, order.last().type)
    }

    @Test
    fun `the blasts walk along the hull rather than piling up in one place`() {
        val w = running()
        val log = downTheRaider(w, seconds = SkyWorld.BOSS_DEATH_SECONDS + 0.5f)
        val spots = log.filter { it.type == SkyWorld.Event.Type.BOSS_BREAK }.map { it.x to it.y }
        assertEquals(SkyWorld.BOSS_BREAKS, spots.size)
        assertEquals("no two blasts should land on the same spot", spots.size, spots.toSet().size)
    }

    @Test
    fun `the stage clears once the wreck is gone`() {
        val w = running()
        downTheRaider(w, seconds = SkyWorld.BOSS_DEATH_SECONDS + 0.5f)
        assertEquals(SkyWorld.State.LEVEL_CLEAR, w.state)
        assertEquals(0f, w.boss?.dying ?: 0f, 1e-4f)
    }

    @Test
    fun `the raider going down clears the sky it filled`() {
        val w = running()
        w.clearWavesForTest()
        w.forceBossForTest(hp = 1)
        w.addEnemyShotForTest(x = 0.3f, y = 0.4f)
        w.addEnemyShotForTest(x = -0.2f, y = 0.3f)
        var frames = 0
        while (frames++ < 600 && w.boss?.alive == true) w.update(1f / 60f)
        assertTrue("no enemy fire should still be live", w.shots.none { !it.fromPlayer && it.alive })
        w.update(1f / 60f)
        assertTrue("and it should be reaped on the next frame", w.shots.none { !it.fromPlayer })
    }

    @Test
    fun `nothing can take the stage back once the raider is down`() {
        val w = running()
        downTheRaider(w)
        w.setForTest(hp = 1, mercy = 0f)
        // a straggler flies straight through you during the fireworks
        w.addEnemyForTest(SkyWorld.Kind.DRONE, x = w.playerX, y = w.playerY)
        repeat(20) { w.update(1f / 60f) }
        assertEquals("a won fight cannot be lost", 1, w.hp)
        assertTrue(w.state == SkyWorld.State.RUNNING || w.state == SkyWorld.State.LEVEL_CLEAR)
    }

    // ---- chains, surges, and a raider that changes its mind -------------------------------------

    /** Drops [n] enemies right on the player's guns, one after another, and returns the events. */
    private fun chainKills(w: SkyWorld, n: Int, gapFrames: Int = 6): List<SkyWorld.Event> {
        val log = ArrayList<SkyWorld.Event>()
        w.soloModeForTest()
        repeat(n) {
            w.addEnemyForTest(SkyWorld.Kind.DRONE, x = w.playerX, y = w.playerY - 0.25f, hp = 1)
            var frames = 0
            while (frames++ < 120 && w.enemies.any { it.alive }) {
                w.update(1f / 60f)
                w.drainEvents(log)
            }
            repeat(gapFrames) { w.update(1f / 60f); w.drainEvents(log) }
        }
        return log
    }

    @Test
    fun `kills land in chains that multiply what they are worth`() {
        val w = running()
        assertEquals("a fresh stage starts with no chain", 0, w.combo)
        assertEquals(1, w.comboMultiplier())
        chainKills(w, SkyWorld.COMBO_STEP)
        assertEquals(SkyWorld.COMBO_STEP, w.combo)
        assertEquals("three in a row should be worth double", 2, w.comboMultiplier())
        chainKills(w, SkyWorld.COMBO_STEP)
        assertEquals(3, w.comboMultiplier())
    }

    @Test
    fun `a chained kill pays more than the same kill cold`() {
        val cold = running(seed = 3)
        chainKills(cold, 1)
        val single = cold.score

        val hot = running(seed = 3)
        chainKills(hot, SkyWorld.COMBO_STEP * 2 + 1)
        assertTrue("the chain should be paying by now", hot.comboMultiplier() >= 3)
        assertTrue(
            "a chain of ${hot.combo} paid ${hot.score} for ${hot.combo} kills, flat would be ${single * hot.combo}",
            hot.score > single * hot.combo,
        )
    }

    @Test
    fun `the chain never pays past its ceiling`() {
        val w = running()
        chainKills(w, SkyWorld.COMBO_STEP * (SkyWorld.MAX_COMBO_MULT + 3))
        assertEquals(SkyWorld.MAX_COMBO_MULT, w.comboMultiplier())
    }

    @Test
    fun `letting the window lapse drops the chain`() {
        val w = running()
        chainKills(w, SkyWorld.COMBO_STEP)
        assertTrue(w.combo > 0)
        repeat((SkyWorld.COMBO_WINDOW * 60).toInt() + 10) { w.update(1f / 60f) }
        assertEquals("the chain should have run out", 0, w.combo)
        assertEquals(1, w.comboMultiplier())
    }

    @Test
    fun `taking a hit costs you the chain`() {
        val w = running()
        chainKills(w, SkyWorld.COMBO_STEP)
        val held = w.combo
        assertTrue(held > 0)
        w.setForTest(mercy = 0f)
        w.addEnemyShotForTest(x = w.playerX, y = w.playerY - 0.01f)
        w.update(1f / 60f)
        assertEquals(SkyWorld.MAX_HP - 1, w.hp)
        assertEquals("a hit should cost the whole chain", 0, w.combo)
        assertEquals("but the run remembers how far you got", held, w.bestCombo)
    }

    @Test
    fun `every stage sends one surge partway down`() {
        val w = running(seed = 11)
        val log = ArrayList<SkyWorld.Event>()
        var frames = 0
        // fly it out far enough to pass the halfway mark, shooting nothing
        while (frames++ < 60 * 90 && w.state == SkyWorld.State.RUNNING && w.boss == null) {
            w.update(1f / 60f)
            w.enemies.forEach { it.y = -0.5f }          // park them so nothing rams the player
            w.drainEvents(log)
        }
        assertEquals("exactly one surge per stage", 1, log.count { it.type == SkyWorld.Event.Type.RUSH })
    }

    @Test
    fun `the surge arrives thicker than an ordinary wave`() {
        val w = running(seed = 4)
        var ordinary = 0
        var surge = 0
        var before = 0
        var frames = 0
        while (frames++ < 60 * 90 && w.boss == null) {
            val was = w.enemies.size
            w.update(1f / 60f)
            val added = w.enemies.size - was
            val log = ArrayList<SkyWorld.Event>()
            w.drainEvents(log)
            if (log.any { it.type == SkyWorld.Event.Type.RUSH }) surge = added else if (added > 0) {
                ordinary = maxOf(ordinary, added)
                before++
            }
            w.enemies.forEach { it.y = -0.5f }
        }
        assertTrue("there should have been ordinary waves first, saw $before", before > 0)
        assertTrue("the surge ($surge) should beat the biggest ordinary wave ($ordinary)", surge > ordinary)
    }

    @Test
    fun `the raider changes its mind twice on the way down`() {
        val w = running()
        w.clearWavesForTest()
        w.forceBossForTest(hp = 300)
        val log = ArrayList<SkyWorld.Event>()
        var frames = 0
        while (frames++ < 60 * 180 && w.boss?.alive == true) {
            w.update(1f / 60f)
            // stay under it, or the sweep carries it out of your guns and nothing lands
            w.boss?.let { w.movePlayerBy(((it.x - w.playerX) * 0.25f).coerceIn(-0.03f, 0.03f)) }
            w.setForTest(hp = SkyWorld.MAX_HP, mercy = 0f)
            w.drainEvents(log)
        }
        val phases = log.filter { it.type == SkyWorld.Event.Type.BOSS_PHASE }.map { it.value }
        assertEquals("two steps, in order", listOf(1, 2), phases)
    }

    @Test
    fun `each raider phase leans on you harder than the last`() {
        fun salvoGap(phase: Int): Float {
            val w = running()
            w.clearWavesForTest()
            w.forceBossForTest(hp = 100000)
            w.forceBossPhaseForTest(phase)
            var fired = 0
            var frames = 0
            var first = -1
            while (frames++ < 60 * 20 && fired < 4) {
                w.update(1f / 60f)
                val log = ArrayList<SkyWorld.Event>()
                w.drainEvents(log)
                if (log.any { it.type == SkyWorld.Event.Type.ENEMY_SHOT }) {
                    if (first < 0) first = frames
                    fired++
                }
            }
            return (frames - first) / 60f / 3f
        }
        val p0 = salvoGap(0)
        val p1 = salvoGap(1)
        val p2 = salvoGap(2)
        assertTrue("phase 1 should fire faster than phase 0 ($p1 vs $p0)", p1 < p0)
        assertTrue("phase 2 should fire faster than phase 1 ($p2 vs $p1)", p2 < p1)
    }

    @Test
    fun `the raider aims at you once it is angry, and never before`() {
        // an aimed shot travels at BOSS_AIMED_SPEED, faster than anything in the fan
        fun aimedShots(phase: Int): Int {
            val w = running()
            w.clearWavesForTest()
            w.forceBossForTest(hp = 100000)
            w.forceBossPhaseForTest(phase)
            repeat(40) { w.movePlayerBy(0.05f) }        // stand well off to one side
            var frames = 0
            var aimed = 0
            while (frames++ < 60 * 6) {
                w.update(1f / 60f)
                w.setForTest(hp = SkyWorld.MAX_HP, mercy = 0f)
                aimed += w.shots.count {
                    !it.fromPlayer &&
                        it.vx * it.vx + it.vy * it.vy >
                        SkyWorld.ENEMY_SHOT_SPEED * SkyWorld.ENEMY_SHOT_SPEED * 1.2f
                }
            }
            return aimed
        }
        assertEquals("a calm raider only throws its fan", 0, aimedShots(0))
        assertTrue("an angry one picks you out of it", aimedShots(1) > 0)
    }

    // ---- continuing, and six raiders that are not the same raider -------------------------------

    /** Flies the run into the ground on whatever stage it is on. */
    private fun die(w: SkyWorld) {
        var guard = 0
        while (w.state == SkyWorld.State.RUNNING && guard++ < 400) {
            w.setForTest(hp = 1, mercy = 0f)
            w.addEnemyForTest(SkyWorld.Kind.DRONE, x = w.playerX, y = w.playerY)
            w.update(1f / 60f)
        }
        assertEquals(SkyWorld.State.GAME_OVER, w.state)
    }

    @Test
    fun `a death picks the run back up on the stage it fell on`() {
        val w = running()
        w.startLevel(3)
        w.setForTest(spread = 4)
        die(w)
        assertEquals(3, w.level)
        assertTrue(w.continueRun())
        assertEquals("you resume where you fell, not at the start", 3, w.level)
        assertEquals(SkyWorld.State.RUNNING, w.state)
        assertEquals("with a fresh aircraft", SkyWorld.MAX_HP, w.hp)
        assertEquals(1, w.spread)
    }

    @Test
    fun `a continue keeps what the run has earned`() {
        val w = running()
        w.soloModeForTest()
        chainKills(w, SkyWorld.COMBO_STEP * 2)
        val score = w.score
        val kills = w.kills
        val chain = w.bestCombo
        assertTrue(score > 0 && kills > 0 && chain > 0)
        die(w)
        w.continueRun()
        assertEquals("the score is yours to keep", score, w.score)
        assertEquals(kills, w.kills)
        assertEquals(chain, w.bestCombo)
    }

    @Test
    fun `the run still ends once the continues are spent`() {
        val w = running()
        assertEquals(SkyWorld.MAX_CONTINUES, w.continues)
        repeat(SkyWorld.MAX_CONTINUES) {
            die(w)
            assertTrue("continue $it should have been available", w.continueRun())
        }
        assertEquals(0, w.continues)
        die(w)
        assertTrue("there should be nothing left to spend", !w.continueRun())
        assertEquals(SkyWorld.State.GAME_OVER, w.state)
    }

    @Test
    fun `a fresh run starts from nothing`() {
        val w = running()
        w.soloModeForTest()
        chainKills(w, SkyWorld.COMBO_STEP * 2)
        die(w)
        w.continueRun()
        w.start()
        assertEquals(1, w.level)
        assertEquals("a new run does not inherit the last one's score", 0, w.score)
        assertEquals(0, w.kills)
        assertEquals(0, w.bestCombo)
        assertEquals(SkyWorld.MAX_CONTINUES, w.continues)
    }

    @Test
    fun `every raider hull has a profile and a way of fighting of its own`() {
        assertEquals(SkyWorld.BOSS_KINDS, SkyWorld.BOSS_PROFILES.size)
        val styles = SkyWorld.BOSS_PROFILES.map { it.style }
        assertEquals("no two raiders should fight the same way", styles.size, styles.toSet().size)
    }

    @Test
    fun `the stages cycle raiders on their own count, so a route changes hands`() {
        val kinds = (1..SkyWorld.BOSS_KINDS * 2).map { (it - 1).mod(SkyWorld.BOSS_KINDS) }
        assertEquals("all six should come round", SkyWorld.BOSS_KINDS, kinds.take(SkyWorld.BOSS_KINDS).toSet().size)
        // four stages, six raiders: flying the same route again brings a different one
        assertTrue(
            "stage 1 should not always draw raider 0",
            (0 until SkyWorld.BOSS_KINDS).map { (it * SkyWorld.PROFILES.size).mod(SkyWorld.BOSS_KINDS) }.toSet().size > 1,
        )
    }

    @Test
    fun `each raider lays down a pattern the others do not`() {
        /** Fires one salvo from raider [kind] at phase 0 and describes what came out. */
        fun salvo(kind: Int): String {
            val w = SkyWorld(9).apply { startLevel(kind + 1) }
            w.clearWavesForTest()
            w.forceBossForTest(hp = 100000)
            w.forceBossKindForTest(kind)
            var frames = 0
            while (frames++ < 60 * 8 && w.shots.none { !it.fromPlayer }) w.update(1f / 60f)
            val shots = w.shots.filter { !it.fromPlayer }
            assertTrue("raider $kind never fired", shots.isNotEmpty())
            val acrossSky = shots.maxOf { it.x } - shots.minOf { it.x }
            val acrossAim = shots.maxOf { it.vx } - shots.minOf { it.vx }
            val straight = shots.count { abs(it.vx) < 1e-3f }
            return "n=${shots.size} sky=${(acrossSky * 10).toInt()} " +
                "aim=${(acrossAim * 10).toInt()} straight=$straight"
        }
        val prints = (0 until SkyWorld.BOSS_KINDS).map { salvo(it) }
        assertEquals(
            "every raider should lay down its own pattern: $prints",
            SkyWorld.BOSS_KINDS,
            prints.toSet().size,
        )
    }

    @Test
    fun `the curtain raider always leaves a way through`() {
        val w = SkyWorld(5).apply { startLevel(1) }
        w.clearWavesForTest()
        w.forceBossForTest(hp = 100000)
        w.forceBossKindForTest(SkyWorld.BOSS_PROFILES.indexOfFirst { it.style == SkyWorld.BossStyle.WALL })
        repeat(4) {
            var frames = 0
            while (frames++ < 60 * 8 && w.shots.none { !it.fromPlayer }) w.update(1f / 60f)
            val curtain = w.shots.filter { !it.fromPlayer }.map { it.x }.sorted()
            assertTrue("a curtain should be more than a couple of shots", curtain.size >= 5)
            val widest = curtain.zipWithNext().maxOf { (a, b) -> b - a }
            assertTrue(
                "there has to be a hole wide enough to fly through, widest gap was $widest",
                widest > SkyWorld.PLAYER_HALF_X * 2f,
            )
            w.clearShotsForTest()
        }
    }

    // ---- ten pickups, on five different axes ----------------------------------------------------

    /** Drops [kind] straight onto the player and lets them fly into it. */
    private fun grab(w: SkyWorld, kind: SkyWorld.ItemKind) {
        w.addItemForTest(kind, x = w.playerX, y = w.playerY - 0.001f)
        w.update(1f / 60f)
    }

    @Test
    fun `the drop table covers every pickup and nothing else`() {
        val listed = SkyWorld.DROP_TABLE.map { it.first }
        assertEquals("every kind should be droppable", SkyWorld.ItemKind.entries.toSet(), listed.toSet())
        assertEquals("and listed once each", listed.size, listed.toSet().size)
        assertTrue("every weight should be positive", SkyWorld.DROP_TABLE.all { it.second > 0 })
    }

    @Test
    fun `the drop roll turns up every pickup, and the staples more often than the exotics`() {
        // the roll itself rather than a three-minute lottery: a rare kind missing once proves nothing
        val w = running()
        val counts = HashMap<SkyWorld.ItemKind, Int>()
        repeat(20000) { counts.merge(w.rollDropForTest(), 1) { a, b -> a + b } }
        assertEquals("every kind should be reachable, saw ${counts.keys}",
            SkyWorld.ItemKind.entries.toSet(), counts.keys)
        // and the table's own ordering should show up in the frequencies
        val heaviest = SkyWorld.DROP_TABLE.maxByOrNull { it.second }!!.first
        val lightest = SkyWorld.DROP_TABLE.minByOrNull { it.second }!!.first
        assertTrue("$heaviest should beat $lightest, saw $counts",
            counts.getValue(heaviest) > counts.getValue(lightest))
    }

    @Test
    fun `a run of ordinary play still drops a spread of kinds`() {
        val seen = HashSet<SkyWorld.ItemKind>()
        for (seed in 1..4) {
            val w = SkyWorld(seed).apply { start() }
            val log = ArrayList<SkyWorld.Event>()
            var frames = 0
            while (frames++ < 60 * 90) {
                w.update(1f / 60f)
                w.setForTest(hp = SkyWorld.MAX_HP, mercy = 0f)
                w.drainEvents(log)
                for (item in w.items) seen.add(item.kind)
                if (w.state == SkyWorld.State.LEVEL_CLEAR) w.nextLevel()
                if (w.state == SkyWorld.State.GAME_OVER) w.start()
            }
        }
        assertTrue("real play should turn up most of the table, saw $seen", seen.size >= 8)
    }

    @Test
    fun `an escort flies beside you and fires with you`() {
        val w = running()
        w.soloModeForTest()
        assertEquals(0, w.wingmen)
        grab(w, SkyWorld.ItemKind.WINGMAN)
        assertEquals(1, w.wingmen)
        assertTrue("it sits off your wingtip", abs(w.wingmanX(0) - w.playerX) > 0.05f)
        // one more gun line in the air than the same moment without an escort
        val withEscort = shotsIn(w, 20)
        val bare = SkyWorld(1).apply { startLevel(1); soloModeForTest() }
        assertTrue("an escort should add fire, $withEscort vs ${shotsIn(bare, 20)}",
            withEscort > shotsIn(bare, 20))
    }

    private fun shotsIn(w: SkyWorld, frames: Int): Int {
        repeat(frames) { w.update(1f / 60f) }
        return w.shots.count { it.fromPlayer }
    }

    @Test
    fun `escorts cap out and a hit takes one before it takes a gun`() {
        val w = running()
        w.soloModeForTest()
        repeat(SkyWorld.MAX_WINGMEN + 3) { grab(w, SkyWorld.ItemKind.WINGMAN) }
        assertEquals(SkyWorld.MAX_WINGMEN, w.wingmen)
        grab(w, SkyWorld.ItemKind.SPREAD)
        val guns = w.spread
        w.setForTest(mercy = 0f)
        w.addEnemyShotForTest(x = w.playerX, y = w.playerY - 0.001f)
        w.update(1f / 60f)
        assertEquals("the escort takes it", SkyWorld.MAX_WINGMEN - 1, w.wingmen)
        assertEquals("so the guns are untouched", guns, w.spread)
    }

    @Test
    fun `a piercing round carries on through the aircraft behind`() {
        val w = running()
        w.soloModeForTest()
        grab(w, SkyWorld.ItemKind.PIERCE)
        assertTrue(w.pierceTimer > 0f)
        // three in a line, one behind the other, right above the guns
        val line = (0 until 3).map {
            w.addEnemyForTest(SkyWorld.Kind.DRONE, x = w.playerX, y = w.playerY - 0.18f - it * 0.09f, hp = 1)
        }
        var frames = 0
        while (frames++ < 90 && line.any { it.alive }) {
            w.update(1f / 60f)
            line.forEachIndexed { i, e -> if (e.alive) e.y = w.playerY - 0.18f - i * 0.09f }
        }
        assertTrue("all three should have come down", line.none { it.alive })
        assertTrue("and the chain should have run", w.combo >= 3)
    }

    @Test
    fun `without pierce a round stops at the first thing it hits`() {
        val w = running()
        w.soloModeForTest()
        val front = w.addEnemyForTest(SkyWorld.Kind.DRONE, x = w.playerX, y = w.playerY - 0.18f, hp = 1)
        val behind = w.addEnemyForTest(SkyWorld.Kind.DRONE, x = w.playerX, y = w.playerY - 0.27f, hp = 1)
        var frames = 0
        while (frames++ < 24 && front.alive) {
            w.update(1f / 60f)
            behind.y = w.playerY - 0.27f
        }
        assertTrue("the front one goes", !front.alive)
        assertTrue("the one behind it does not, not on that round", behind.alive)
    }

    @Test
    fun `homing rounds lean towards what is up there`() {
        fun offBy(homing: Boolean): Float {
            val w = running()
            w.soloModeForTest()
            if (homing) grab(w, SkyWorld.ItemKind.HOMING)
            val e = w.addEnemyForTest(SkyWorld.Kind.DRONE, x = 0.5f, y = 0.35f, hp = 9999)
            var frames = 0
            var closest = Float.MAX_VALUE
            while (frames++ < 60) {
                w.update(1f / 60f)
                e.x = 0.5f; e.y = 0.35f
                for (s in w.shots) {
                    if (!s.fromPlayer) continue
                    closest = minOf(closest, abs(s.x - e.x))
                }
            }
            return closest
        }
        val straight = offBy(false)
        val guided = offBy(true)
        assertTrue("a guided round should end up nearer the target, $guided vs $straight", guided < straight)
    }

    @Test
    fun `the magnet reels pickups in instead of letting them fall past`() {
        fun caught(magnet: Boolean): Boolean {
            val w = running()
            w.soloModeForTest()
            if (magnet) grab(w, SkyWorld.ItemKind.MAGNET)
            val before = w.spread
            // well off to one side, where it would otherwise sail past
            w.addItemForTest(SkyWorld.ItemKind.SPREAD, x = w.playerX + 0.45f, y = w.playerY - 0.4f)
            repeat(120) { w.update(1f / 60f) }
            return w.spread > before
        }
        assertTrue("a pickup off to the side is normally lost", !caught(false))
        assertTrue("the magnet should bring it to you", caught(true))
    }

    @Test
    fun `the charm eats one chain break and then it is gone`() {
        val w = running()
        w.soloModeForTest()
        chainKills(w, SkyWorld.COMBO_STEP)
        grab(w, SkyWorld.ItemKind.CHARM)
        assertTrue(w.charm)
        val held = w.combo
        assertTrue(held > 0)
        w.setForTest(mercy = 0f)
        w.addEnemyShotForTest(x = w.playerX, y = w.playerY - 0.001f)
        w.update(1f / 60f)
        assertEquals("the hit still lands", SkyWorld.MAX_HP - 1, w.hp)
        assertEquals("but the chain is held", held, w.combo)
        assertTrue("and the charm is spent", !w.charm)
        // the next one costs the chain for real
        w.setForTest(mercy = 0f)
        w.addEnemyShotForTest(x = w.playerX, y = w.playerY - 0.001f)
        w.update(1f / 60f)
        assertEquals(0, w.combo)
    }

    @Test
    fun `a new stage hands back a clean loadout`() {
        val w = running()
        w.soloModeForTest()
        for (kind in SkyWorld.ItemKind.entries) grab(w, kind)
        assertTrue(w.wingmen > 0 && w.pierceTimer > 0f && w.homingTimer > 0f && w.magnetTimer > 0f && w.charm)
        w.startLevel(2)
        assertEquals(0, w.wingmen)
        assertEquals(0f, w.pierceTimer, 1e-5f)
        assertEquals(0f, w.homingTimer, 1e-5f)
        assertEquals(0f, w.magnetTimer, 1e-5f)
        assertTrue(!w.charm)
    }

    // ---- eight ways to be in the way -------------------------------------------------------------

    @Test
    fun `a shielder turns away anything that comes straight at its nose`() {
        val w = running()
        w.soloModeForTest()
        // it weaves, so chase it: the plate is only a plate for a shot on its centre line
        val head = w.addEnemyForTest(SkyWorld.Kind.SHIELDER, x = 0f, y = w.playerY - 0.22f, hp = 3)
        val log = ArrayList<SkyWorld.Event>()
        var frames = 0
        while (frames++ < 240) {
            w.setForTest(playerX = head.x)
            w.update(1f / 60f)
            w.drainEvents(log)
            if (head.alive) head.y = w.playerY - 0.22f
        }
        assertTrue("shooting a plate head on should do nothing", head.alive)
        assertEquals("and it should not even be scratched", head.maxHp, head.hp)
        assertTrue("the bounces should be announced",
            log.count { it.type == SkyWorld.Event.Type.DEFLECT } > 5)
    }

    @Test
    fun `but a shielder has sides, and they are open`() {
        val w = running()
        w.soloModeForTest()
        val flanked = w.addEnemyForTest(SkyWorld.Kind.SHIELDER, x = 0f, y = w.playerY - 0.22f, hp = 3)
        var frames = 0
        while (frames++ < 480 && flanked.alive) {
            // stand off its shoulder rather than its nose
            w.setForTest(playerX = flanked.x - w.halfOf(SkyWorld.Kind.SHIELDER) * 0.8f)
            w.update(1f / 60f)
            if (flanked.alive) flanked.y = w.playerY - 0.22f
        }
        assertTrue("coming at it from the side should get through", !flanked.alive)
    }

    @Test
    fun `a splitter leaves two behind it`() {
        val w = running()
        w.soloModeForTest()
        val fat = w.addEnemyForTest(SkyWorld.Kind.SPLITTER, x = w.playerX, y = w.playerY - 0.3f, hp = 1)
        val log = ArrayList<SkyWorld.Event>()
        var frames = 0
        while (frames++ < 180 && fat.alive) {
            w.update(1f / 60f)
            w.drainEvents(log)
            if (fat.alive) fat.y = w.playerY - 0.3f
        }
        assertTrue("the splitter should have gone down", !fat.alive)
        assertEquals("and said so", 1, log.count { it.type == SkyWorld.Event.Type.SPLIT })
        val halves = w.enemies.filter { it.alive }
        assertEquals("two smaller ones in its place", 2, halves.size)
        assertTrue("on either side of where it was", halves.map { it.x }.toSet().size == 2)
        assertTrue("and they are not splitters themselves",
            halves.none { it.kind == SkyWorld.Kind.SPLITTER })
    }

    @Test
    fun `a bomb splits them too, and counts every piece`() {
        val w = running()
        w.soloModeForTest()
        repeat(3) { w.addEnemyForTest(SkyWorld.Kind.SPLITTER, x = -0.4f + it * 0.4f, y = 0.3f, hp = 2) }
        assertTrue(w.useBomb())
        assertEquals("three splitters become six drones", 6, w.enemies.count { it.alive })
    }

    @Test
    fun `a turret takes station instead of flying past`() {
        val w = running()
        w.soloModeForTest()
        val gun = w.addEnemyForTest(SkyWorld.Kind.TURRET, x = 0.3f, y = 0.05f, hp = 999)
        var frames = 0
        var parkedFor = 0
        var lastY = gun.y
        while (frames++ < 60 * 5) {
            w.update(1f / 60f)
            if (abs(gun.y - lastY) < 1e-4f) parkedFor++
            lastY = gun.y
        }
        assertTrue("it should have stopped somewhere and stayed, parked $parkedFor frames", parkedFor > 60 * 3)
        assertTrue("around its station, saw ${gun.y}", abs(gun.y - SkyWorld.TURRET_STATION_Y) < 0.05f)
        assertTrue("and shot at you while it sat there", w.shots.any { !it.fromPlayer })
    }

    @Test
    fun `a turret gives up eventually rather than blocking the stage forever`() {
        val w = running()
        w.soloModeForTest()
        val gun = w.addEnemyForTest(SkyWorld.Kind.TURRET, x = 0.3f, y = 0.05f, hp = 999)
        var frames = 0
        while (frames++ < 60 * 30 && gun.alive && gun.y < 1.1f) w.update(1f / 60f)
        assertTrue("it should be gone or on its way out, saw ${gun.y}", !gun.alive || gun.y > 1.0f)
    }

    @Test
    fun `a swarm bee is a smaller thing to hit than a heavy`() {
        val w = running()
        assertTrue(w.halfOf(SkyWorld.Kind.SWARM) < w.halfOf(SkyWorld.Kind.DRONE))
        assertTrue(w.halfOf(SkyWorld.Kind.SHIELDER) > w.halfOf(SkyWorld.Kind.DRONE))
        // and a shot that would miss a bee still hits a drone in the same place
        // the collision test itself, asked directly: a weaving bee cannot be pinned for a race
        val edge = SkyWorld.ENEMY_HALF * 0.8f
        val bee = w.addEnemyForTest(SkyWorld.Kind.SWARM, x = 0f, y = 0.4f)
        val drone = w.addEnemyForTest(SkyWorld.Kind.DRONE, x = 0f, y = 0.4f)
        assertTrue("a drone that wide is still hit", w.wouldHitForTest(drone, edge, 0.4f))
        assertTrue("a bee that far out is missed", !w.wouldHitForTest(bee, edge, 0.4f))
        assertTrue("but dead centre it goes down", w.wouldHitForTest(bee, 0f, 0.4f))
        assertTrue("and a shielder is wider than either", w.wouldHitForTest(
            w.addEnemyForTest(SkyWorld.Kind.SHIELDER, x = 0f, y = 0.4f), SkyWorld.ENEMY_HALF * 1.1f, 0.4f))
    }

    @Test
    fun `the plate covers the nose and nothing further out`() {
        val w = running()
        val plate = w.addEnemyForTest(SkyWorld.Kind.SHIELDER, x = 0f, y = 0.4f)
        val half = w.halfOf(SkyWorld.Kind.SHIELDER)
        assertTrue("dead centre bounces", w.wouldDeflectForTest(plate, 0f))
        assertTrue("just inside the arc bounces", w.wouldDeflectForTest(plate, half * SkyWorld.SHIELD_ARC * 0.9f))
        assertTrue("outside it does not", !w.wouldDeflectForTest(plate, half * 0.95f))
        // and nothing else in the sky has a plate at all
        for (kind in SkyWorld.Kind.entries) {
            if (kind == SkyWorld.Kind.SHIELDER) continue
            assertTrue("$kind should have no plate",
                !w.wouldDeflectForTest(w.addEnemyForTest(kind, x = 0f, y = 0.4f), 0f))
        }
    }

    @Test
    fun `every kind flies, and the stages between them use all of them`() {
        val used = SkyWorld.PROFILES.flatMap { it.mix }.toSet()
        // a mine is laid, never sent: everything else has to be in somebody's roster
        val expected = SkyWorld.Kind.entries.toSet() - SkyWorld.Kind.MINE
        assertEquals("every kind that flies itself should show up somewhere", expected, used)
        assertTrue("and a mine is not something a stage sends", SkyWorld.Kind.MINE !in used)
        // and each stage keeps a roster of its own
        val rosters = SkyWorld.PROFILES.map { it.mix.toSet() }
        assertEquals("no two stages should field exactly the same roster", rosters.size, rosters.toSet().size)
    }

    @Test
    fun `a swarm arrives as a crowd and a shielder does not`() {
        val w = SkyWorld(3).apply { startLevel(1) }
        fun flight(kind: SkyWorld.Kind): Int {
            var most = 0
            repeat(40) {
                val g = SkyWorld(it + 1).apply { startLevel(1) }
                g.clearWavesForTest()
                most = maxOf(most, g.spawnFlightForTest(kind))
            }
            return most
        }
        assertTrue(w.state == SkyWorld.State.RUNNING)
        assertTrue("a swarm should outnumber a shielder flight",
            flight(SkyWorld.Kind.SWARM) > flight(SkyWorld.Kind.SHIELDER) + 2)
    }

    // ---- what the stage was worth -----------------------------------------------------------------

    @Test
    fun `flying a stage clean with a long chain earns the top grade`() {
        val w = running()
        w.soloModeForTest()
        chainKills(w, SkyWorld.RANK_S_CHAIN)
        assertEquals("no hits and a long chain is an S", 0, w.stageRank())
        assertEquals(0, w.stageHits)
    }

    @Test
    fun `taking hits walks the grade down`() {
        fun rankAfter(hits: Int): Int {
            val w = running()
            w.soloModeForTest()
            chainKills(w, SkyWorld.RANK_S_CHAIN)
            repeat(hits) {
                w.setForTest(hp = SkyWorld.MAX_HP, mercy = 0f)
                w.addEnemyShotForTest(x = w.playerX, y = w.playerY - 0.001f)
                w.update(1f / 60f)
            }
            return w.stageRank()
        }
        assertEquals(0, rankAfter(0))
        assertEquals("one hit drops you off the top", 1, rankAfter(1))
        assertEquals(2, rankAfter(2))
        assertEquals("four is the bottom", 3, rankAfter(4))
    }

    @Test
    fun `the grade is per stage, not per run`() {
        val w = running()
        w.soloModeForTest()
        w.setForTest(mercy = 0f)
        w.addEnemyShotForTest(x = w.playerX, y = w.playerY - 0.001f)
        w.update(1f / 60f)
        assertEquals(1, w.stageHits)
        w.startLevel(2)
        assertEquals("a new stage starts clean", 0, w.stageHits)
        assertEquals(0, w.stageBestCombo)
    }

    // ---- the miner, the charger and the healer -----------------------------------------------------

    @Test
    fun `a miner leaves mines behind it, and they stay put`() {
        val w = running()
        w.soloModeForTest()
        val miner = w.addEnemyForTest(SkyWorld.Kind.MINER, x = 0f, y = 0.2f, hp = 999)
        val log = ArrayList<SkyWorld.Event>()
        var frames = 0
        while (frames++ < 60 * 6) {
            w.update(1f / 60f)
            w.drainEvents(log)
            miner.y = 0.2f
        }
        val laid = log.count { it.type == SkyWorld.Event.Type.MINE_LAID }
        assertTrue("it should have laid several, saw $laid", laid >= 2)
        val mines = w.enemies.filter { it.alive && it.kind == SkyWorld.Kind.MINE }
        assertTrue("and they should still be there", mines.isNotEmpty())
        // a mine barely moves: over a second it should drift far less than an aircraft would
        val mine = mines.first()
        val y0 = mine.y
        repeat(60) { w.update(1f / 60f) }
        val drift = mine.y - y0
        assertTrue("a mine should hang about, drifted $drift", drift in 0f..0.08f)
    }

    @Test
    fun `a mine is a thing you can shoot as well as a thing you can hit`() {
        val w = running()
        w.soloModeForTest()
        val mine = w.addEnemyForTest(SkyWorld.Kind.MINE, x = w.playerX, y = w.playerY - 0.25f, hp = 1)
        var frames = 0
        while (frames++ < 180 && mine.alive) w.update(1f / 60f)
        assertTrue("it should be clearable from a distance", !mine.alive)
    }

    @Test
    fun `a charger tells you the lane before it takes it`() {
        val w = running()
        w.soloModeForTest()
        val run = w.addEnemyForTest(SkyWorld.Kind.CHARGER, x = 0.5f, y = 0.1f, hp = 999)
        w.setForTest(playerX = -0.5f)
        val log = ArrayList<SkyWorld.Event>()
        // it should hang about first rather than arriving immediately
        var frames = 0
        var yAtTell = 0f
        while (frames++ < 60 * 3) {
            w.update(1f / 60f)
            w.drainEvents(log)
            if (log.any { it.type == SkyWorld.Event.Type.CHARGE } && yAtTell == 0f) yAtTell = run.y
        }
        assertEquals("the tell should fire once", 1, log.count { it.type == SkyWorld.Event.Type.CHARGE })
        assertTrue("and it should still be well up the screen when it does, was $yAtTell", yAtTell < 0.4f)
        assertTrue("then it comes, and fast, ended at ${run.y}", run.y > 0.8f || !run.alive)
        assertTrue("down the lane you were in, ended at ${run.x}", run.x < 0.2f)
    }

    @Test
    fun `a healer puts back what you just took off, and will not mend itself`() {
        val w = running()
        w.soloModeForTest()
        // well off the firing line, or the player simply finishes the patient off
        val medic = w.addEnemyForTest(SkyWorld.Kind.HEALER, x = 0.45f, y = 0.25f, hp = 3)
        val patient = w.addEnemyForTest(SkyWorld.Kind.GUNNER, x = 0.55f, y = 0.3f, hp = 4)
        patient.hpForTest(1)
        medic.hpForTest(1)
        val log = ArrayList<SkyWorld.Event>()
        var frames = 0
        while (frames++ < 60 * 4) {
            w.update(1f / 60f)
            w.drainEvents(log)
            medic.y = 0.25f
            patient.y = 0.3f
        }
        assertTrue("it should have mended somebody", log.any { it.type == SkyWorld.Event.Type.HEAL })
        assertTrue("the damaged one comes back up, at ${patient.hp}", patient.hp > 1)
        assertEquals("and the healer does not mend itself", 1, medic.hp)
    }

    @Test
    fun `a healer out of range is no help at all`() {
        val w = running()
        w.soloModeForTest()
        val medic = w.addEnemyForTest(SkyWorld.Kind.HEALER, x = -0.85f, y = 0.1f, hp = 3)
        val patient = w.addEnemyForTest(SkyWorld.Kind.GUNNER, x = 0.85f, y = 0.9f, hp = 4)
        patient.hpForTest(1)
        var frames = 0
        while (frames++ < 60 * 4) {
            w.update(1f / 60f)
            medic.y = 0.1f
            patient.y = 0.9f
        }
        assertEquals("too far away to help", 1, patient.hp)
    }

    // ---- slow, orbit, drain, medal -------------------------------------------------------------------

    @Test
    fun `the clock slows what is coming at you and not what you are firing`() {
        val w = running()
        w.soloModeForTest()
        val theirs = w.addEnemyShotForTest(x = 0.5f, y = 0.2f)
        repeat(30) { w.update(1f / 60f) }
        val theirFast = theirs.y - 0.2f
        val mineFast = w.shots.filter { it.fromPlayer }.size

        val g = running()
        g.soloModeForTest()
        g.addItemForTest(SkyWorld.ItemKind.SLOW, x = g.playerX, y = g.playerY - 0.001f)
        g.update(1f / 60f)
        assertTrue(g.slowTimer > 0f)
        val slowed = g.addEnemyShotForTest(x = 0.5f, y = 0.2f)
        repeat(30) { g.update(1f / 60f) }
        val theirSlow = slowed.y - 0.2f
        assertTrue("their fire should crawl, $theirSlow vs $theirFast", theirSlow < theirFast * 0.7f)
        assertTrue("yours should not, ${g.shots.count { it.fromPlayer }} vs $mineFast",
            g.shots.count { it.fromPlayer } >= mineFast - 2)
    }

    @Test
    fun `orbs circle you and eat what runs into them`() {
        val w = running()
        w.soloModeForTest()
        assertEquals(0, w.orbs)
        grab(w, SkyWorld.ItemKind.ORBIT)
        assertEquals(1, w.orbs)
        assertTrue("an orb sits off the aircraft", abs(w.orbX(0) - w.playerX) > 0.01f ||
            abs(w.orbY(0) - w.playerY) > 0.01f)
        // drop a round right onto where the orb is and it should be eaten, not land
        val log = ArrayList<SkyWorld.Event>()
        val hpBefore = w.hp
        w.setForTest(mercy = 0f)
        var blocked = false
        var frames = 0
        while (frames++ < 240 && !blocked) {
            w.addEnemyShotForTest(x = w.orbX(0), y = w.orbY(0) - 0.01f, vy = 0.05f)
            w.update(1f / 60f)
            w.drainEvents(log)
            blocked = log.any { it.type == SkyWorld.Event.Type.ORBIT_BLOCK }
        }
        assertTrue("the orb should have eaten one", blocked)
        assertEquals("and nothing got through while it did", hpBefore, w.hp)
    }

    @Test
    fun `orbs cap out`() {
        val w = running()
        w.soloModeForTest()
        repeat(SkyWorld.MAX_ORBS + 3) { grab(w, SkyWorld.ItemKind.ORBIT) }
        assertEquals(SkyWorld.MAX_ORBS, w.orbs)
    }

    @Test
    fun `draining pays for aggression in hit points`() {
        val w = running()
        w.soloModeForTest()
        w.setForTest(hp = 2)
        grab(w, SkyWorld.ItemKind.VAMPIRE)
        assertTrue(w.vampTimer > 0f)
        chainKills(w, SkyWorld.VAMP_KILLS)
        assertEquals("eight kills should have put one back", 3, w.hp)
    }

    @Test
    fun `draining never pushes past a full aircraft`() {
        val w = running()
        w.soloModeForTest()
        grab(w, SkyWorld.ItemKind.VAMPIRE)
        chainKills(w, SkyWorld.VAMP_KILLS * 2)
        assertEquals(SkyWorld.MAX_HP, w.hp)
    }

    @Test
    fun `a medal is worth whatever your chain is paying`() {
        fun medalWorth(chainKills: Int): Int {
            val w = running()
            w.soloModeForTest()
            if (chainKills > 0) chainKills(w, chainKills)
            val before = w.score
            val log = ArrayList<SkyWorld.Event>()
            w.addItemForTest(SkyWorld.ItemKind.MEDAL, x = w.playerX, y = w.playerY - 0.001f)
            w.update(1f / 60f)
            w.drainEvents(log)
            val medal = log.first { it.type == SkyWorld.Event.Type.MEDAL }
            assertTrue("the score should have moved by it", w.score - before >= medal.value)
            return medal.value
        }
        val cold = medalWorth(0)
        val hot = medalWorth(SkyWorld.COMBO_STEP * 3)
        assertEquals(SkyWorld.MEDAL_SCORE, cold)
        assertTrue("a medal on a chain should pay more, $hot vs $cold", hot > cold)
    }

    @Test
    fun `a new stage takes back the clock, the orbs and the drain`() {
        val w = running()
        w.soloModeForTest()
        for (kind in listOf(SkyWorld.ItemKind.SLOW, SkyWorld.ItemKind.ORBIT, SkyWorld.ItemKind.VAMPIRE)) {
            grab(w, kind)
        }
        assertTrue(w.slowTimer > 0f && w.orbs > 0 && w.vampTimer > 0f)
        w.startLevel(2)
        assertEquals(0f, w.slowTimer, 1e-5f)
        assertEquals(0, w.orbs)
        assertEquals(0f, w.vampTimer, 1e-5f)
        assertEquals(1f, w.enemyTimeScale(), 1e-5f)
    }

    // ---- what you pick between stages ---------------------------------------------------------

    /** Flies the stage to its end so the boons come out. */
    private fun clearStage(w: SkyWorld) {
        w.clearWavesForTest()
        w.forceBossForTest(hp = 1)
        var frames = 0
        while (frames++ < 60 * 30 && w.state == SkyWorld.State.RUNNING) {
            w.update(1f / 60f)
            w.setForTest(hp = w.maxHp(), mercy = 0f)
        }
        assertEquals(SkyWorld.State.LEVEL_CLEAR, w.state)
    }

    @Test
    fun `clearing a stage lays out three to pick between`() {
        val w = running()
        assertTrue("nothing is on offer mid-stage", w.offered.isEmpty())
        clearStage(w)
        assertEquals(SkyWorld.BOONS_OFFERED, w.offered.size)
        assertEquals("and no two the same", w.offered.size, w.offered.toSet().size)
    }

    @Test
    fun `taking one keeps it, flies on, and clears the offer`() {
        val w = running()
        clearStage(w)
        val picked = w.offered.first()
        assertEquals(0, w.boonLevel(picked))
        assertTrue(w.takeBoon(0))
        assertEquals(1, w.boonLevel(picked))
        assertEquals(SkyWorld.State.RUNNING, w.state)
        assertEquals("you are on the next stage", 2, w.level)
        assertTrue("and there is nothing left to pick", w.offered.isEmpty())
    }

    @Test
    fun `you cannot take one that is not on offer, or take one twice`() {
        val w = running()
        clearStage(w)
        assertTrue("there is no fourth card", !w.takeBoon(SkyWorld.BOONS_OFFERED))
        assertTrue(!w.takeBoon(-1))
        assertTrue(w.takeBoon(0))
        assertTrue("and once taken the offer is closed", !w.takeBoon(0))
    }

    @Test
    fun `a boon is for the run, not the stage`() {
        val w = running()
        clearStage(w)
        // force the one we want to check rather than hoping for it
        w.giveBoonForTest(SkyWorld.Boon.ARMOUR)
        w.takeBoon(0)
        assertEquals("armour raises the ceiling", SkyWorld.MAX_HP + 1, w.maxHp())
        assertEquals("and you start the stage at it", w.maxHp(), w.hp)
        w.startLevel(3)
        assertEquals("still there two stages later", SkyWorld.MAX_HP + 1, w.maxHp())
        assertEquals(w.maxHp(), w.hp)
    }

    @Test
    fun `each boon actually changes the thing it says it changes`() {
        fun withBoon(boon: SkyWorld.Boon, times: Int = 1): SkyWorld {
            val g = running()
            repeat(times) { g.giveBoonForTest(boon) }
            g.startLevel(1)
            return g
        }
        val plain = running()
        assertEquals(SkyWorld.MAX_HP + 1, withBoon(SkyWorld.Boon.ARMOUR).maxHp())
        assertEquals(SkyWorld.START_BOMBS + 1, withBoon(SkyWorld.Boon.BOMBS).bombs)
        assertEquals(2, withBoon(SkyWorld.Boon.GUNS).spread)
        assertEquals(1, withBoon(SkyWorld.Boon.ESCORT).wingmen)
        assertTrue(withBoon(SkyWorld.Boon.RAPIDFIRE).fireRate() > plain.fireRate())
        assertTrue(withBoon(SkyWorld.Boon.CHAINWINDOW).comboWindow() > plain.comboWindow())
        assertTrue(withBoon(SkyWorld.Boon.CHARMED).charm)
        assertTrue(withBoon(SkyWorld.Boon.MAGNETIC).standingPull() > 0f)
        assertEquals(1, withBoon(SkyWorld.Boon.PIERCING).basePierce())
        assertTrue(withBoon(SkyWorld.Boon.SUPPLY).itemChance() > plain.itemChance())
        assertTrue(withBoon(SkyWorld.Boon.AGILITY).frontLimit() < plain.frontLimit())
        assertTrue(withBoon(SkyWorld.Boon.CHAINCAP).maxComboMult() > plain.maxComboMult())
    }

    @Test
    fun `a piercing core makes an ordinary round go through`() {
        val w = running()
        w.giveBoonForTest(SkyWorld.Boon.PIERCING)
        w.startLevel(1)
        w.soloModeForTest()
        val line = (0 until 2).map {
            w.addEnemyForTest(SkyWorld.Kind.DRONE, x = w.playerX, y = w.playerY - 0.18f - it * 0.09f, hp = 1)
        }
        var frames = 0
        while (frames++ < 60 && line.any { it.alive }) {
            w.update(1f / 60f)
            line.forEachIndexed { i, e -> if (e.alive) e.y = w.playerY - 0.18f - i * 0.09f }
        }
        assertTrue("both should go down without a pickup", line.none { it.alive })
    }

    @Test
    fun `an agile aircraft can fly further forward than a plain one`() {
        val plain = running()
        repeat(60) { plain.movePlayerBy(0f, -0.05f) }
        val agile = running()
        agile.giveBoonForTest(SkyWorld.Boon.AGILITY)
        agile.startLevel(1)
        repeat(60) { agile.movePlayerBy(0f, -0.05f) }
        assertTrue("agility should buy you sky, ${agile.playerY} vs ${plain.playerY}",
            agile.playerY < plain.playerY)
        assertTrue("but never into the raider's hull",
            agile.frontLimit() > SkyWorld.BOSS_STATION_Y + SkyWorld.BOSS_HALF + SkyWorld.PLAYER_HALF_Y)
    }

    @Test
    fun `the offer stops showing what is already maxed out`() {
        val w = running()
        // fill a one-shot boon and check it drops out of every future offer
        repeat(SkyWorld.boonCap(SkyWorld.Boon.CHARMED)) { w.giveBoonForTest(SkyWorld.Boon.CHARMED) }
        var offers = 0
        for (stage in 1..12) {
            w.startLevel(stage)
            clearStage(w)
            offers++
            assertTrue("a maxed boon should not be offered again", SkyWorld.Boon.CHARMED !in w.offered)
            w.takeBoon(0)
        }
        assertTrue(offers >= 12)
    }

    @Test
    fun `a fresh run drops everything the last one carried`() {
        val w = running()
        w.giveBoonForTest(SkyWorld.Boon.ARMOUR)
        w.giveBoonForTest(SkyWorld.Boon.GUNS)
        assertTrue(w.boons.isNotEmpty())
        w.start()
        assertTrue("a new run starts bare", w.boons.isEmpty())
        assertEquals(SkyWorld.MAX_HP, w.maxHp())
        assertEquals(1, w.spread)
    }

    @Test
    fun `a continue keeps the run's boons`() {
        val w = running()
        w.giveBoonForTest(SkyWorld.Boon.ARMOUR)
        w.startLevel(3)
        die(w)
        assertTrue(w.continueRun())
        assertEquals("you resume with what you built", 1, w.boonLevel(SkyWorld.Boon.ARMOUR))
        assertEquals(SkyWorld.MAX_HP + 1, w.hp)
    }

    // ---- flying itself ---------------------------------------------------------------------

    private fun aiSeconds(w: SkyWorld, seconds: Float) {
        val bag = ArrayList<SkyWorld.Event>()
        repeat((seconds * 60f).toInt()) {
            w.aiTick(1f / 60f)
            w.update(1f / 60f)
            bag.clear()
            w.drainEvents(bag)
        }
    }

    @Test
    fun `flying itself starts the stage rather than waiting on a tap`() {
        val w = SkyWorld(1)
        w.setAi(true)
        assertEquals(SkyWorld.State.READY, w.state)
        aiSeconds(w, SkyWorld.AI_PAUSE * 0.5f)
        assertEquals("it holds on the panel long enough to be read", SkyWorld.State.READY, w.state)
        aiSeconds(w, SkyWorld.AI_PAUSE)
        assertEquals(SkyWorld.State.RUNNING, w.state)
    }

    @Test
    fun `flying itself gets out of the lane of an aimed round`() {
        val w = running()
        w.soloModeForTest()
        w.setAi(true)
        w.setForTest(hp = 5, playerX = 0f, playerY = 0.85f, mercy = 0f)
        w.addEnemyShotForTest(0f, 0.45f)
        aiSeconds(w, 1.5f)
        assertEquals("it should have stepped aside rather than worn it", 5, w.hp)
    }

    @Test
    fun `flying itself flies under what it is shooting`() {
        val w = running()
        w.soloModeForTest()
        w.setAi(true)
        w.setForTest(playerX = -0.8f, playerY = 0.9f)
        val foe = w.addEnemyForTest(SkyWorld.Kind.DRONE, x = 0.5f, y = -0.5f, hp = 99)
        aiSeconds(w, 2f)
        assertTrue(
            "it should line up on its target, not drift away from it",
            abs(w.playerX - foe.x) < 0.2f,
        )
    }

    @Test
    fun `flying itself takes a boon rather than waving the panel through`() {
        val w = running()
        clearStage(w)
        assertTrue(w.offered.isNotEmpty())
        w.setAi(true)
        aiSeconds(w, SkyWorld.AI_PAUSE + 0.5f)
        assertTrue("it should take one of the three on offer", w.boons.isNotEmpty())
    }

    @Test
    fun `flying itself picks the run back up where it fell`() {
        val w = running()
        w.startLevel(2)
        die(w)
        w.setAi(true)
        aiSeconds(w, SkyWorld.AI_PAUSE + 0.5f)
        assertEquals(SkyWorld.State.RUNNING, w.state)
        assertEquals("and carries on from the stage it fell in", 2, w.level)
    }

    @Test
    fun `switching it off hands the aircraft straight back`() {
        val w = running()
        w.soloModeForTest()
        w.setAi(true)
        w.setForTest(playerX = 0f, playerY = 0.85f)
        w.addEnemyShotForTest(0f, 0.5f)
        aiSeconds(w, 0.6f)
        assertTrue("it moved while it was flying", abs(w.playerX) > 1e-3f)
        w.setAi(false)
        val parked = w.playerX
        aiSeconds(w, 0.6f)
        assertEquals("and stays put once you have it back", parked, w.playerX, 1e-5f)
    }

    @Test
    fun `flying itself clears a stage without being shot down`() {
        val w = SkyWorld(1)
        w.setAi(true)
        val bag = ArrayList<SkyWorld.Event>()
        var frames = 0
        var fell = false
        while (frames++ < 60 * 180 && w.bestLevel < 1) {
            w.aiTick(1f / 60f)
            w.update(1f / 60f)
            bag.clear()
            w.drainEvents(bag)
            if (w.state == SkyWorld.State.GAME_OVER) fell = true
        }
        assertTrue("it should get a stage down on its own", w.bestLevel >= 1)
        assertTrue("and get there without falling", !fell)
    }

    @Test
    fun `a diver stacked high above the screen still comes down`() {
        val w = running()
        w.soloModeForTest()
        // a rush used to stack one high enough that its own acceleration ran backwards, and a
        // stage with an aircraft that climbs away for ever is a stage that never ends
        val diver = w.addEnemyForTest(SkyWorld.Kind.DIVER, x = 0f, y = -1.4f, hp = 99)
        val start = diver.y
        repeat(120) { w.update(1f / 60f) }
        assertTrue("a diver only ever comes down", diver.y > start)
    }

    @Test
    fun `flying itself eases onto the stick rather than snapping to full travel`() {
        val w = running()
        w.soloModeForTest()
        w.setAi(true)
        w.setForTest(playerX = 0f, playerY = 0.9f, mercy = 0f)
        // something worth crossing for, far enough away that it wants all the speed it can get
        w.addEnemyForTest(SkyWorld.Kind.DRONE, x = 0.8f, y = -0.6f, hp = 99)
        w.aiTick(1f / 60f)
        w.update(1f / 60f)
        val first = abs(w.playerX)
        val full = SkyWorld.AI_SPEED / 60f
        assertTrue(
            "it used to move a whole step on the first frame, which is what made it look wrong",
            first in 1e-5f..full * 0.5f,
        )
        // and it is still an aircraft: given a moment it does get up to speed
        var last = w.playerX
        var fastest = 0f
        repeat(40) {
            w.aiTick(1f / 60f)
            w.update(1f / 60f)
            fastest = max(fastest, abs(w.playerX - last))
            last = w.playerX
        }
        assertTrue("easing must not leave it crawling", fastest > full * 0.7f)
    }

    @Test
    fun `flying itself yanks the stick when something is about to hit it`() {
        val w = running()
        w.soloModeForTest()
        w.setAi(true)
        w.setForTest(playerX = 0f, playerY = 0.85f, mercy = 0f)
        w.addEnemyShotForTest(0f, 0.8f)          // right on top of it
        var fastest = 0f
        var last = w.playerX
        // a tenth of a second: long enough to be out of the way, short enough that a frame of it
        // is still an aircraft accelerating rather than an aircraft teleporting
        repeat(6) {
            w.aiTick(1f / 60f)
            w.update(1f / 60f)
            fastest = max(fastest, abs(w.playerX - last))
            last = w.playerX
        }
        assertTrue(
            "with a round on it, it should be out of the lane inside a tenth of a second",
            abs(w.playerX) > SkyWorld.SHOT_HALF + SkyWorld.PLAYER_HALF_X,
        )
        assertTrue(
            "but no frame of it may be the whole dodge",
            fastest <= SkyWorld.AI_SPEED / 60f + 1e-5f,
        )
    }

    @Test
    fun `flying itself does not bolt at a round that is still a long way off`() {
        val w = running()
        w.soloModeForTest()
        w.setAi(true)
        w.setForTest(playerX = 0f, playerY = 0.9f, mercy = 0f)
        // dead ahead and on its way, but most of a second out: from outside there is no reason
        // to move yet, so moving hard would read as the aircraft bolting at nothing
        w.addEnemyShotForTest(0f, 0.25f)
        w.aiTick(1f / 60f)
        w.update(1f / 60f)
        assertTrue(
            "a distant round is something to ease away from, not to bolt from",
            abs(w.playerX) < SkyWorld.AI_SPEED / 60f * 0.5f,
        )
    }
}
