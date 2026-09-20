package com.richroro.skystrike

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LightingColorFilter
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.media.AudioAttributes
import android.media.SoundPool
import android.os.Build
import android.util.AttributeSet
import android.view.Choreographer
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.View
import android.view.WindowInsets
import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

/** Draws [SkyWorld] on a plain Canvas. Screen space is x in [-1,1] across, y in [0,1] down. */
class SkyView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : View(context, attrs) {

    private val world = SkyWorld(seed = (System.currentTimeMillis() % 1_000_000L).toInt() + 1)
    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private var bestLevel = prefs.getInt(KEY_BEST_LEVEL, 0)
    private var bestScore = prefs.getInt(KEY_BEST_SCORE, 0)
    private var muted = prefs.getBoolean(KEY_MUTED, false)

    // ---- sound ------------------------------------------------------------------------------
    private var soundPool: SoundPool? = null
    private var sndShot = 0
    private var sndHit = 0
    private var sndDing = 0
    private var sndBuzz = 0
    private var sndClear = 0
    private var sndOver = 0
    private var sndPickup = 0
    private var sndBoom = 0
    private var sndRoar = 0
    private val lastPlayedNanos = LongArray(9)

    private fun openSounds() {
        if (soundPool != null) return
        val pool = SoundPool.Builder()
            .setMaxStreams(10)
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_GAME)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build(),
            )
            .build()
        sndShot = pool.load(context, R.raw.sfx_shot, 1)
        sndHit = pool.load(context, R.raw.sfx_hit, 1)
        sndDing = pool.load(context, R.raw.sfx_ding, 1)
        sndBuzz = pool.load(context, R.raw.sfx_buzz, 1)
        sndClear = pool.load(context, R.raw.sfx_clear, 1)
        sndOver = pool.load(context, R.raw.sfx_over, 1)
        sndPickup = pool.load(context, R.raw.sfx_pickup, 1)
        sndBoom = pool.load(context, R.raw.sfx_boom, 1)
        sndRoar = pool.load(context, R.raw.sfx_roar, 1)
        soundPool = pool
        lastPlayedNanos.fill(0L)
    }

    private fun closeSounds() {
        soundPool?.release()
        soundPool = null
    }

    private fun play(
        id: Int,
        slot: Int,
        minIntervalMs: Long,
        volume: Float,
        rateJitter: Float = 0f,
        pitch: Float = 1f,
    ) {
        if (muted) return
        val pool = soundPool ?: return
        val now = System.nanoTime()
        if (now - lastPlayedNanos[slot] < minIntervalMs * 1_000_000L) return
        lastPlayedNanos[slot] = now
        val rate = (pitch + (fxRandom.nextFloat() * 2f - 1f) * rateJitter).coerceIn(0.5f, 2f)
        pool.play(id, volume, volume, 1, 0, rate)
    }

    // ---- effects ----------------------------------------------------------------------------
    private class Particle(
        var x: Float, var y: Float, var vx: Float, var vy: Float,
        var life: Float, val maxLife: Float, val color: Int, val size: Float, val drag: Float,
    )

    private class FloatText(val text: String, val x: Float, val y: Float, var life: Float, val maxLife: Float, val color: Int)

    private val particles = ArrayList<Particle>()
    private val floatTexts = ArrayList<FloatText>()
    private val events = ArrayList<SkyWorld.Event>()
    private val fxRandom = java.util.Random()
    private var muzzleTimer = 0f
    private var shakeTimer = 0f
    private var flashTimer = 0f
    private var flashColor = 0
    private var bombTimer = 0f

    private var running = false
    private var lastFrameNanos = 0L
    private var runTime = 0f
    private var insetTop = 0f
    private var lastTouchX = 0f
    private var lastTouchY = 0f
    private var dragging = false
    /** Which finger is flying the plane, so a bomb tap with the other hand cannot steal it. */
    private var dragPointer = -1
    private var onPad = false
    private var padKnobX = 0f
    private var padKnobY = 0f
    private var padGlow = 0f
    private var smokeTimer = 0f
    /** Kicks the chain counter up a size when it steps, then settles. */
    private var comboPop = 0f
    private var comboPitch = 1f
    private var banner = ""
    private var bannerTimer = 0f
    /** 1 normally; dips towards zero for the hitstop when the raider goes, then winds back. */
    private var timeScale = 1f
    /** Fades the flight-band ceiling in while you are steering, so the limit is visible. */
    private var bandHint = 0f
    private var padUsed = prefs.getBoolean(KEY_PAD_USED, false)
    private val padRect = RectF()
    private val aiRect = RectF()

    // ---- paint ------------------------------------------------------------------------------
    private val skyPaint = Paint()
    private val seaPaint = Paint()
    private val cloudPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val particlePaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val muzzlePaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val flashPaint = Paint()
    private val spritePaint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)
    private val hitPaint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG).apply {
        colorFilter = LightingColorFilter(0xFFFFFFFF.toInt(), 0x00FF6060)
    }
    private val shadowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0x33000000 }
    private val mendPaint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG).apply {
        colorFilter = LightingColorFilter(0xFF80FF80.toInt(), 0x0020FF40)
    }
    private val tracerPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = color(R.color.tracer) }
    private val tracerCorePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = color(R.color.tracer_core) }
    private val foeShotPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = color(R.color.foe_shot) }
    private val foeShotCorePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = color(R.color.foe_shot_core) }
    private val panelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = color(R.color.panel) }
    private val panelEdgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = color(R.color.panel_edge); style = Paint.Style.STROKE
    }
    private val padPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        color = color(R.color.panel_edge)
    }
    private val padFillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = color(R.color.panel) }
    private val cardPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = color(R.color.panel_edge); alpha = 70 }
    private val hpPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val hpTrackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = color(R.color.hp_track) }
    private val bossHpPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = color(R.color.boss_hp) }
    private val bossHpTrackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = color(R.color.boss_hp_track) }
    private val shieldPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = color(R.color.shield_ring); style = Paint.Style.STROKE
    }
    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textAlign = Paint.Align.CENTER; typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    }
    private val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textAlign = Paint.Align.CENTER; style = Paint.Style.STROKE
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        strokeJoin = Paint.Join.ROUND
    }
    private val bodyPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = color(R.color.text); textAlign = Paint.Align.CENTER
    }
    private val rect = RectF()

    // ---- sprites ----------------------------------------------------------------------------
    private val playerFrames: Array<Bitmap> = arrayOf(
        BitmapFactory.decodeResource(resources, R.drawable.player_0),
        BitmapFactory.decodeResource(resources, R.drawable.player_1),
    )
    private val foeFrames: Array<Array<Bitmap>> = arrayOf(
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.foe_0_0), BitmapFactory.decodeResource(resources, R.drawable.foe_0_1)),
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.foe_1_0), BitmapFactory.decodeResource(resources, R.drawable.foe_1_1)),
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.foe_2_0), BitmapFactory.decodeResource(resources, R.drawable.foe_2_1)),
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.foe_3_0), BitmapFactory.decodeResource(resources, R.drawable.foe_3_1)),
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.foe_4_0), BitmapFactory.decodeResource(resources, R.drawable.foe_4_1)),
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.foe_5_0), BitmapFactory.decodeResource(resources, R.drawable.foe_5_1)),
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.foe_6_0), BitmapFactory.decodeResource(resources, R.drawable.foe_6_1)),
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.foe_7_0), BitmapFactory.decodeResource(resources, R.drawable.foe_7_1)),
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.foe_8_0), BitmapFactory.decodeResource(resources, R.drawable.foe_8_1)),
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.foe_9_0), BitmapFactory.decodeResource(resources, R.drawable.foe_9_1)),
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.foe_10_0), BitmapFactory.decodeResource(resources, R.drawable.foe_10_1)),
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.foe_11_0), BitmapFactory.decodeResource(resources, R.drawable.foe_11_1)),
    )
    private val raiderFrames: Array<Array<Bitmap>> = arrayOf(
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.raider_0_0), BitmapFactory.decodeResource(resources, R.drawable.raider_0_1)),
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.raider_1_0), BitmapFactory.decodeResource(resources, R.drawable.raider_1_1)),
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.raider_2_0), BitmapFactory.decodeResource(resources, R.drawable.raider_2_1)),
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.raider_3_0), BitmapFactory.decodeResource(resources, R.drawable.raider_3_1)),
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.raider_4_0), BitmapFactory.decodeResource(resources, R.drawable.raider_4_1)),
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.raider_5_0), BitmapFactory.decodeResource(resources, R.drawable.raider_5_1)),
    )
    private val pickupBitmaps: Map<SkyWorld.ItemKind, Bitmap> = mapOf(
        SkyWorld.ItemKind.SPREAD to BitmapFactory.decodeResource(resources, R.drawable.pickup_spread),
        SkyWorld.ItemKind.RAPID to BitmapFactory.decodeResource(resources, R.drawable.pickup_rapid),
        SkyWorld.ItemKind.SHIELD to BitmapFactory.decodeResource(resources, R.drawable.pickup_shield),
        SkyWorld.ItemKind.BOMB to BitmapFactory.decodeResource(resources, R.drawable.pickup_bomb),
        SkyWorld.ItemKind.REPAIR to BitmapFactory.decodeResource(resources, R.drawable.pickup_repair),
        SkyWorld.ItemKind.WINGMAN to BitmapFactory.decodeResource(resources, R.drawable.pickup_wingman),
        SkyWorld.ItemKind.PIERCE to BitmapFactory.decodeResource(resources, R.drawable.pickup_pierce),
        SkyWorld.ItemKind.HOMING to BitmapFactory.decodeResource(resources, R.drawable.pickup_homing),
        SkyWorld.ItemKind.MAGNET to BitmapFactory.decodeResource(resources, R.drawable.pickup_magnet),
        SkyWorld.ItemKind.CHARM to BitmapFactory.decodeResource(resources, R.drawable.pickup_charm),
        SkyWorld.ItemKind.SLOW to BitmapFactory.decodeResource(resources, R.drawable.pickup_slow),
        SkyWorld.ItemKind.ORBIT to BitmapFactory.decodeResource(resources, R.drawable.pickup_orbit),
        SkyWorld.ItemKind.VAMPIRE to BitmapFactory.decodeResource(resources, R.drawable.pickup_vampire),
        SkyWorld.ItemKind.MEDAL to BitmapFactory.decodeResource(resources, R.drawable.pickup_medal),
    )
    private val wingmanFrames: Array<Bitmap> = arrayOf(
        BitmapFactory.decodeResource(resources, R.drawable.wingman_0),
        BitmapFactory.decodeResource(resources, R.drawable.wingman_1),
    )

    private val stagePlaces: Array<String> = resources.getStringArray(R.array.stage_place)
    private val bossNames: Array<String> = resources.getStringArray(R.array.boss_name)
    private val boonNames: Array<String> = resources.getStringArray(R.array.boon_name)
    private val boonDescs: Array<String> = resources.getStringArray(R.array.boon_desc)
    /** Where the three cards were last drawn, so a tap can be matched to one. */
    private val boonCards = Array(SkyWorld.BOONS_OFFERED) { RectF() }
    private fun bossName(kind: Int): String = bossNames[kind.mod(bossNames.size)]
    private val stageTags: Array<String> = resources.getStringArray(R.array.stage_tag)
    private val stageStories: Array<String> = resources.getStringArray(R.array.stage_story)
    private val stageClears: Array<String> = resources.getStringArray(R.array.stage_clear)

    private fun stageIndex(level: Int): Int = (level - 1).mod(stagePlaces.size)
    private fun color(id: Int): Int = resources.getColor(id, null)

    /** Drifting cloud decks; two layers at different speeds so the sky has depth. */
    private class Cloud(val x: Float, var y: Float, val r: Float, val far: Boolean)
    private val clouds = ArrayList<Cloud>()

    /** What a stage looks like. The names already promised four different skies; this delivers them. */
    private enum class Ambient { CALM, LIGHTNING, EMBERS, STARS }

    private class Theme(
        val top: Int, val mid: Int, val low: Int,
        val cloudNear: Int, val cloudFar: Int,
        val alphaNear: Int, val alphaFar: Int,
        val ground: Int, val groundFrom: Float,
        val accent: Int,
        val ambient: Ambient,
    )

    private val themes: Array<Theme> by lazy {
        arrayOf(
            Theme(color(R.color.s1_top), color(R.color.s1_mid), color(R.color.s1_low),
                color(R.color.s1_cloud), color(R.color.s1_cloud_far), 125, 70,
                color(R.color.s1_ground), 0.82f, color(R.color.s1_cloud), Ambient.CALM),
            Theme(color(R.color.s2_top), color(R.color.s2_mid), color(R.color.s2_low),
                color(R.color.s2_cloud), color(R.color.s2_cloud_far), 190, 140,
                color(R.color.s2_ground), 0.74f, color(R.color.s2_bolt), Ambient.LIGHTNING),
            Theme(color(R.color.s3_top), color(R.color.s3_mid), color(R.color.s3_low),
                color(R.color.s3_cloud), color(R.color.s3_cloud_far), 150, 105,
                color(R.color.s3_ground), 0.78f, color(R.color.s3_ember), Ambient.EMBERS),
            Theme(color(R.color.s4_top), color(R.color.s4_mid), color(R.color.s4_low),
                color(R.color.s4_cloud), color(R.color.s4_cloud_far), 95, 55,
                color(R.color.s4_ground), 0.88f, color(R.color.s4_star), Ambient.STARS),
        )
    }

    private fun theme(): Theme = themes[stageIndex(world.level)]

    /** Embers drifting up out of the fires, or the star field on the night run. */
    private class Mote(var x: Float, var y: Float, var vx: Float, var vy: Float, val r: Float, val phase: Float)
    private val motes = ArrayList<Mote>()
    private var motesFor = -1
    private var boltTimer = 2.5f
    private var boltFlash = 0f
    private var boltX = 0f

    init {
        isFocusable = true
        isClickable = true
        val r = java.util.Random(7)
        repeat(18) {
            clouds.add(Cloud(-1.1f + r.nextFloat() * 2.2f, r.nextFloat(), 0.08f + r.nextFloat() * 0.16f, it % 2 == 0))
        }
    }

    // ---- frame loop -------------------------------------------------------------------------
    private val frameCallback = object : Choreographer.FrameCallback {
        override fun doFrame(frameTimeNanos: Long) {
            if (!running) return
            val dt = if (lastFrameNanos == 0L) 0f else (frameTimeNanos - lastFrameNanos) / 1_000_000_000f
            lastFrameNanos = frameTimeNanos
            runTime += dt
            // hitstop: the world nearly stops when the raider goes, then winds back up. The
            // recovery runs on the real clock so the slow-motion itself cannot slow down.
            timeScale = min(1f, timeScale + dt * TIME_RECOVERY)
            val scaled = dt * timeScale
            val before = world.state
            // the autopilot flies on the same clock the world runs on, so a hitstop slows its
            // hands too rather than handing it a free frame
            world.aiTick(scaled)
            world.update(scaled)
            world.drainEvents(events)
            for (e in events) handleEvent(e)
            events.clear()
            updateFx(scaled)
            // the flash is a camera effect, not a world one: it fades on the real clock, or the
            // hitstop would hold a white screen over the whole moment you are meant to be watching
            flashTimer = max(0f, flashTimer - dt * 2.2f)
            if (before == SkyWorld.State.RUNNING && world.state != SkyWorld.State.RUNNING) onRunEnded()
            invalidate()
            Choreographer.getInstance().postFrameCallback(this)
        }
    }

    fun resume() {
        if (running) return
        running = true
        lastFrameNanos = 0L
        Choreographer.getInstance().postFrameCallback(frameCallback)
    }

    fun pause() {
        running = false
        Choreographer.getInstance().removeFrameCallback(frameCallback)
        invalidate()
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        openSounds()
        resume()
    }

    override fun onDetachedFromWindow() {
        pause()
        closeSounds()
        super.onDetachedFromWindow()
    }

    override fun onApplyWindowInsets(insets: WindowInsets): WindowInsets {
        insetTop = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            insets.getInsets(WindowInsets.Type.systemBars()).top.toFloat()
        } else {
            @Suppress("DEPRECATION") insets.systemWindowInsetTop.toFloat()
        }
        return super.onApplyWindowInsets(insets)
    }

    private fun onRunEnded() {
        bestLevel = max(bestLevel, world.bestLevel)
        bestScore = max(bestScore, world.score)
        prefs.edit().putInt(KEY_BEST_LEVEL, bestLevel).putInt(KEY_BEST_SCORE, bestScore).apply()
    }

    // ---- effects ----------------------------------------------------------------------------
    private fun sparks(x: Float, y: Float, n: Int, color: Int, spread: Float, size: Float = 0.006f) {
        repeat(n) {
            val a = fxRandom.nextFloat() * SkyWorld.TAU
            val v = spread * (0.3f + fxRandom.nextFloat())
            particles.add(
                Particle(
                    x = x, y = y,
                    vx = kotlin.math.cos(a) * v, vy = sin(a) * v,
                    life = 0.3f + fxRandom.nextFloat() * 0.35f, maxLife = 0.65f,
                    color = color, size = size + fxRandom.nextFloat() * size, drag = 2.4f,
                ),
            )
        }
    }

    /** Chunks of hull: bigger than a spark, slower, and they keep going instead of stopping. */
    private fun debris(x: Float, y: Float, n: Int) {
        repeat(n) {
            val a = fxRandom.nextFloat() * SkyWorld.TAU
            val v = 0.18f + fxRandom.nextFloat() * 0.3f
            particles.add(
                Particle(
                    x = x, y = y,
                    vx = kotlin.math.cos(a) * v, vy = sin(a) * v - 0.05f,
                    life = 0.8f + fxRandom.nextFloat() * 0.7f, maxLife = 1.5f,
                    color = color(R.color.smoke),
                    size = 0.014f + fxRandom.nextFloat() * 0.014f, drag = 0.5f,
                ),
            )
        }
    }

    private fun floatText(text: String, x: Float, y: Float, color: Int) {
        floatTexts.add(FloatText(text, x, y, 0.85f, 0.85f, color))
    }

    private fun screenFlash(color: Int, strength: Float) {
        flashColor = color
        flashTimer = strength
    }

    private fun handleEvent(e: SkyWorld.Event) {
        when (e.type) {
            SkyWorld.Event.Type.SHOT -> {
                muzzleTimer = 0.055f
                play(sndShot, 0, 45, 0.28f, 0.16f)
            }
            SkyWorld.Event.Type.ENEMY_SHOT -> play(sndHit, 1, 70, 0.2f, 0.2f)
            SkyWorld.Event.Type.HIT_ENEMY -> {
                sparks(e.x, e.y, 3, color(R.color.spark_good), 0.22f)
                play(sndHit, 1, 35, 0.3f, 0.25f)
            }
            SkyWorld.Event.Type.KILL_ENEMY -> {
                // a kill deeper into a chain throws more and rings higher
                val mult = e.value.coerceIn(1, SkyWorld.MAX_COMBO_MULT)
                sparks(e.x, e.y, 14 + mult * 3, color(R.color.spark_good), 0.5f + mult * 0.04f, 0.008f)
                sparks(e.x, e.y, 8, color(R.color.smoke), 0.3f, 0.012f)
                shakeTimer = max(shakeTimer, 0.08f)
                comboPitch = 1f + (mult - 1) * 0.085f
                play(sndDing, 2, 40, 0.4f, 0.2f, comboPitch)
            }
            SkyWorld.Event.Type.COMBO_UP -> {
                comboPop = 1f
                floatText("x${'$'}{e.value}", e.x, e.y, color(R.color.gold))
                play(sndPickup, 6, 60, 0.45f, 0f, 1f + e.value * 0.06f)
            }
            SkyWorld.Event.Type.COMBO_LOST -> {
                comboPop = 0f
                floatText(context.getString(R.string.combo_lost), e.x, e.y - 0.06f, color(R.color.smoke))
            }
            SkyWorld.Event.Type.MINE_LAID -> play(sndHit, 1, 90, 0.25f, 0.1f, 0.6f)
            SkyWorld.Event.Type.CHARGE -> {
                // the moment it commits: you get a beat and a bark
                sparks(e.x, e.y, 12, color(R.color.hp_low), 0.5f, 0.01f)
                shakeTimer = max(shakeTimer, 0.14f)
                play(sndRoar, 8, 120, 0.5f, 0f, 1.7f)
            }
            SkyWorld.Event.Type.HEAL -> {
                sparks(e.x, e.y, 8, color(R.color.hp_full), 0.28f, 0.009f)
                play(sndPickup, 6, 150, 0.35f, 0f, 1.5f)
            }
            SkyWorld.Event.Type.ORBIT_BLOCK -> {
                sparks(e.x, e.y, 6, color(R.color.shield_ring), 0.3f, 0.008f)
                play(sndHit, 1, 45, 0.3f, 0.15f, 1.35f)
            }
            SkyWorld.Event.Type.VAMP_HEAL -> {
                sparks(e.x, e.y, 16, color(R.color.hp_full), 0.45f, 0.011f)
                floatText(context.getString(R.string.item_vampire), e.x, e.y, color(R.color.hp_full))
                play(sndPickup, 6, 0, 0.7f, 0f, 0.85f)
            }
            SkyWorld.Event.Type.BOON_TAKEN -> {
                val boon = SkyWorld.Boon.entries[e.value.coerceIn(0, SkyWorld.Boon.entries.size - 1)]
                banner = boonNames[boon.ordinal]
                bannerTimer = 1.4f
                play(sndClear, 5, 0, 0.7f, 0f, 1.2f)
            }
            SkyWorld.Event.Type.MEDAL -> {
                sparks(e.x, e.y, 20, color(R.color.gold), 0.5f, 0.012f)
                floatText("+${'$'}{e.value}", e.x, e.y, color(R.color.gold))
                play(sndPickup, 6, 0, 0.8f, 0f, 1.25f)
            }
            SkyWorld.Event.Type.DEFLECT -> {
                // a bounce off the plate: hard, bright, and it gets you nothing
                sparks(e.x, e.y, 5, color(R.color.smoke), 0.3f, 0.007f)
                play(sndHit, 1, 40, 0.35f, 0.15f, 1.6f)
            }
            SkyWorld.Event.Type.SPLIT -> {
                sparks(e.x, e.y, 14, color(R.color.spark_good), 0.5f, 0.01f)
                shakeTimer = max(shakeTimer, 0.12f)
                play(sndDing, 2, 40, 0.45f, 0.2f, 0.75f)
            }
            SkyWorld.Event.Type.CHARM_USED -> {
                sparks(e.x, e.y, 18, color(R.color.gold), 0.45f, 0.01f)
                floatText(context.getString(R.string.charm_saved), e.x, e.y - 0.05f, color(R.color.gold))
                play(sndPickup, 6, 0, 0.8f, 0f, 0.8f)
            }
            SkyWorld.Event.Type.RUSH -> {
                banner = context.getString(R.string.rush_in)
                bannerTimer = 1.5f
                shakeTimer = max(shakeTimer, 0.25f)
                play(sndRoar, 8, 0, 0.55f, 0f, 1.35f)
            }
            SkyWorld.Event.Type.BOSS_PHASE -> {
                banner = context.getString(R.string.boss_rage)
                bannerTimer = 1.2f
                sparks(e.x, e.y, 26, color(R.color.spark_bad), 0.7f, 0.012f)
                shakeTimer = max(shakeTimer, 0.45f)
                screenFlash(color(R.color.hp_low), 0.3f)
                play(sndRoar, 8, 0, 0.9f, 0f, 1f + e.value * 0.14f)
            }
            SkyWorld.Event.Type.HIT_BOSS -> {
                sparks(e.x, e.y, 3, color(R.color.spark_good), 0.25f)
                play(sndHit, 1, 35, 0.3f, 0.25f)
            }
            SkyWorld.Event.Type.BOSS_DOWN -> {
                // the moment it stops being an enemy: everything holds still for a beat
                timeScale = HITSTOP_SCALE
                sparks(e.x, e.y, 34, color(R.color.spark_good), 0.75f, 0.013f)
                sparks(e.x, e.y, 14, color(R.color.smoke), 0.35f, 0.022f)
                shakeTimer = 0.55f
                screenFlash(Color.WHITE, 0.38f)
                play(sndBoom, 7, 0, 0.9f)
                performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
            }
            SkyWorld.Event.Type.BOSS_BREAK -> {
                // each blast walks a little further along the hull and hits a little harder
                val t = e.value / 100f
                sparks(e.x, e.y, 10 + (t * 14).toInt(), color(R.color.spark_good), 0.45f + t * 0.35f, 0.011f)
                sparks(e.x, e.y, 6 + (t * 8).toInt(), color(R.color.smoke), 0.28f + t * 0.2f, 0.02f)
                debris(e.x, e.y, 3 + (t * 4).toInt())
                shakeTimer = max(shakeTimer, 0.16f + t * 0.16f)
                screenFlash(color(R.color.s3_ember), 0.1f + t * 0.14f)
                play(sndDing, 2, 30, 0.5f + t * 0.4f, 0.18f)
            }
            SkyWorld.Event.Type.KILL_BOSS -> {
                sparks(e.x, e.y, 70, color(R.color.spark_good), 1.1f, 0.015f)
                sparks(e.x, e.y, 36, color(R.color.smoke), 0.7f, 0.022f)
                debris(e.x, e.y, 16)
                shakeTimer = 0.7f
                screenFlash(Color.WHITE, 0.55f)
                floatText(context.getString(R.string.raider_down, bossName(e.value)), e.x, e.y, color(R.color.gold))
                play(sndBoom, 7, 0, 1f)
                performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
            }
            SkyWorld.Event.Type.HIT_PLAYER -> {
                sparks(e.x, e.y, 22, color(R.color.spark_bad), 0.55f, 0.01f)
                shakeTimer = max(shakeTimer, 0.35f)
                screenFlash(color(R.color.hp_low), 0.4f)
                play(sndBuzz, 3, 0, 0.8f)
                performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
            }
            SkyWorld.Event.Type.SHIELD_USED -> {
                sparks(e.x, e.y, 20, color(R.color.shield_ring), 0.5f)
                floatText(context.getString(R.string.item_shield), e.x, e.y, color(R.color.shield_ring))
                play(sndPickup, 6, 0, 0.7f)
            }
            SkyWorld.Event.Type.PICKUP -> {
                val kind = e.item ?: return
                floatText(context.getString(itemName(kind)), e.x, e.y, color(R.color.gold))
                sparks(e.x, e.y, 12, color(R.color.gold), 0.35f)
                play(sndPickup, 6, 0, 0.7f)
            }
            SkyWorld.Event.Type.BOMB -> {
                bombTimer = 0.45f
                shakeTimer = 0.5f
                screenFlash(color(R.color.bomb_flash), 0.55f)
                play(sndBoom, 7, 0, 1f)
            }
            SkyWorld.Event.Type.BOSS_IN -> {
                floatText(bossName(e.value), 0f, 0.3f, color(R.color.spark_bad))
                shakeTimer = 0.5f
                play(sndRoar, 8, 0, 0.9f)
            }
            SkyWorld.Event.Type.CLEAR -> play(sndClear, 4, 0, 0.9f)
            SkyWorld.Event.Type.OVER -> play(sndOver, 5, 0, 0.9f)
        }
    }

    private fun itemName(kind: SkyWorld.ItemKind): Int = when (kind) {
        SkyWorld.ItemKind.SPREAD -> R.string.item_spread
        SkyWorld.ItemKind.RAPID -> R.string.item_rapid
        SkyWorld.ItemKind.SHIELD -> R.string.item_shield
        SkyWorld.ItemKind.BOMB -> R.string.item_bomb
        SkyWorld.ItemKind.REPAIR -> R.string.item_repair
        SkyWorld.ItemKind.WINGMAN -> R.string.item_wingman
        SkyWorld.ItemKind.PIERCE -> R.string.item_pierce
        SkyWorld.ItemKind.HOMING -> R.string.item_homing
        SkyWorld.ItemKind.MAGNET -> R.string.item_magnet
        SkyWorld.ItemKind.CHARM -> R.string.item_charm
        SkyWorld.ItemKind.SLOW -> R.string.item_slow
        SkyWorld.ItemKind.ORBIT -> R.string.item_orbit
        SkyWorld.ItemKind.VAMPIRE -> R.string.item_vampire
        SkyWorld.ItemKind.MEDAL -> R.string.item_medal
    }

    private fun updateFx(dt: Float) {
        muzzleTimer = max(0f, muzzleTimer - dt)
        shakeTimer = max(0f, shakeTimer - dt)
        bombTimer = max(0f, bombTimer - dt)
        world.boss?.let { b ->
            // a steady trail off the wreck, so the gaps between blasts are not empty
            if (!b.alive && b.dying > 0f) {
                smokeTimer -= dt
                while (smokeTimer <= 0f) {
                    smokeTimer += 0.035f
                    val sx = b.x + (fxRandom.nextFloat() - 0.5f) * SkyWorld.BOSS_HALF
                    val sy = b.y + (fxRandom.nextFloat() - 0.5f) * SkyWorld.BOSS_HALF * 0.6f
                    sparks(sx, sy, 1, color(R.color.smoke), 0.12f, 0.018f)
                    if (fxRandom.nextFloat() < 0.45f) sparks(sx, sy, 1, color(R.color.s3_ember), 0.2f, 0.009f)
                }
            } else {
                smokeTimer = 0f
            }
        }
        comboPop = max(0f, comboPop - dt * 2.4f)
        bannerTimer = max(0f, bannerTimer - dt)
        padGlow = if (onPad) min(1f, padGlow + dt * 6f) else max(0f, padGlow - dt * 3f)
        bandHint = if (dragging) min(1f, bandHint + dt * 4f) else max(0f, bandHint - dt * 1.4f)
        if (!onPad) {
            // the knob drifts home when you let go
            padKnobX += (padRect.centerX() - padKnobX) * min(1f, dt * 9f)
            padKnobY += (padRect.centerY() - padKnobY) * min(1f, dt * 9f)
        }
        val pi = particles.iterator()
        while (pi.hasNext()) {
            val p = pi.next()
            p.life -= dt
            if (p.life <= 0f) { pi.remove(); continue }
            p.x += p.vx * dt
            p.y += p.vy * dt
            val k = max(0f, 1f - p.drag * dt)
            p.vx *= k
            p.vy *= k
            p.vy += 0.35f * dt            // drifts down with the airstream
        }
        val ti = floatTexts.iterator()
        while (ti.hasNext()) {
            val t = ti.next()
            t.life -= dt
            if (t.life <= 0f) ti.remove()
        }
        val scroll = SCROLL_SPEED * dt
        for (c in clouds) {
            c.y += scroll * (if (c.far) 0.45f else 1f)
            if (c.y > 1.25f) c.y -= 1.6f
        }
        updateAmbient(dt)
    }

    private fun updateAmbient(dt: Float) {
        val t = theme()
        val stage = stageIndex(world.level)
        if (motesFor != stage) {
            motesFor = stage
            motes.clear()
            val r = java.util.Random(stage * 9176L + 3)
            when (t.ambient) {
                Ambient.EMBERS -> repeat(46) {
                    motes.add(Mote(-1.05f + r.nextFloat() * 2.1f, r.nextFloat(),
                        (r.nextFloat() - 0.5f) * 0.05f, -0.09f - r.nextFloat() * 0.13f,
                        0.0035f + r.nextFloat() * 0.005f, r.nextFloat() * SkyWorld.TAU))
                }
                Ambient.STARS -> repeat(70) {
                    motes.add(Mote(-1.05f + r.nextFloat() * 2.1f, r.nextFloat(), 0f,
                        0.012f + r.nextFloat() * 0.02f,
                        0.0022f + r.nextFloat() * 0.0035f, r.nextFloat() * SkyWorld.TAU))
                }
                else -> {}
            }
        }
        for (m in motes) {
            m.x += m.vx * dt
            m.y += m.vy * dt
            if (m.y < -0.06f) { m.y = 1.06f; m.x = -1.05f + fxRandom.nextFloat() * 2.1f }
            if (m.y > 1.06f) { m.y = -0.06f; m.x = -1.05f + fxRandom.nextFloat() * 2.1f }
        }
        if (t.ambient == Ambient.LIGHTNING) {
            boltFlash = max(0f, boltFlash - dt * 3.4f)
            boltTimer -= dt
            if (boltTimer <= 0f) {
                boltTimer = 2.2f + fxRandom.nextFloat() * 4.5f
                boltFlash = 1f
                boltX = -0.7f + fxRandom.nextFloat() * 1.4f
            }
        } else {
            boltFlash = 0f
        }
    }

    // ---- input ------------------------------------------------------------------------------
    override fun onTouchEvent(event: MotionEvent): Boolean {
        val w = width.toFloat()
        val h = height.toFloat()
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN, MotionEvent.ACTION_POINTER_DOWN -> {
                val i = event.actionIndex
                val x = event.getX(i)
                val y = event.getY(i)
                if (!running) resume()
                if (bombButtonHit(x, y)) {
                    world.useBomb()
                    return true
                }
                if (aiButtonHit(x, y)) {
                    world.setAi(!world.ai)
                    banner = context.getString(if (world.ai) R.string.ai_on else R.string.ai_off)
                    bannerTimer = 1.1f
                    return true
                }
                if (dragPointer < 0) beginDrag(event.getPointerId(i), x, y, w, h)
                when (world.state) {
                    SkyWorld.State.READY -> world.start()
                    SkyWorld.State.LEVEL_CLEAR -> if (!takeCardAt(x, y)) world.nextLevel()
                    // a death picks the run back up where it fell, while you still have a resume
                    SkyWorld.State.GAME_OVER -> if (!world.continueRun()) world.start()
                    SkyWorld.State.RUNNING -> {}
                }
                performClick()
            }
            MotionEvent.ACTION_MOVE -> {
                val i = event.findPointerIndex(dragPointer)
                if (dragging && i >= 0 && w > 0f && h > 0f) {
                    val x = event.getX(i)
                    val y = event.getY(i)
                    // a tap is for the panels; actually flying the thing is how you take it back
                    if (world.ai) {
                        world.setAi(false)
                        banner = context.getString(R.string.ai_off)
                        bannerTimer = 1.1f
                    }
                    // The pad multiplies your thumb, so a short stroke crosses the whole band;
                    // dragging the plane itself stays one-to-one, the way it always has.
                    val gain = if (onPad) PAD_GAIN else 1f
                    world.movePlayerBy((x - lastTouchX) / (w * 0.5f) * gain, (y - lastTouchY) / h * gain)
                    lastTouchX = x
                    lastTouchY = y
                    if (onPad) moveKnob(x, y, w)
                }
            }
            MotionEvent.ACTION_POINTER_UP -> {
                if (event.getPointerId(event.actionIndex) == dragPointer) endDrag()
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> endDrag()
        }
        return true
    }

    /** Matches a tap to one of the three cards, if it landed on one. */
    private fun takeCardAt(x: Float, y: Float): Boolean {
        if (world.offered.isEmpty()) return false
        for (i in world.offered.indices) {
            if (i < boonCards.size && boonCards[i].contains(x, y)) return world.takeBoon(i)
        }
        return false            // tapped the panel but not a card: wait rather than skipping a pick
    }

    private fun beginDrag(pointerId: Int, x: Float, y: Float, w: Float, h: Float) {
        layOutPad(w, h)
        dragPointer = pointerId
        dragging = true
        lastTouchX = x
        lastTouchY = y
        onPad = padRect.contains(x, y)
        if (onPad) {
            moveKnob(x, y, w)
            if (!padUsed) {
                padUsed = true
                prefs.edit().putBoolean(KEY_PAD_USED, true).apply()
            }
        }
    }

    private fun endDrag() {
        dragging = false
        onPad = false
        dragPointer = -1
    }

    private fun moveKnob(x: Float, y: Float, w: Float) {
        val r = w * PAD_KNOB
        padKnobX = x.coerceIn(padRect.left + r, padRect.right - r)
        padKnobY = y.coerceIn(padRect.top + r, padRect.bottom - r)
    }

    /** Parks the steering pad in the bottom-left corner, clear of the bomb button. */
    private fun layOutPad(w: Float, h: Float) {
        val pw = w * 0.44f
        val ph = min(w * 0.30f, h * 0.22f)
        val left = w * 0.05f
        val bottom = h - w * 0.05f
        padRect.set(left, bottom - ph, left + pw, bottom)
        if (!padPlaced) {
            padPlaced = true
            padKnobX = padRect.centerX()
            padKnobY = padRect.centerY()
        }
    }
    private var padPlaced = false

    override fun performClick(): Boolean {
        super.performClick()
        return true
    }

    /**
     * Parks the autopilot pill above the bomb button: the one corner that is neither the
     * steering pad nor anything you need to read in a hurry.
     */
    private fun layOutAi(w: Float, h: Float) {
        val pw = w * 0.19f
        val ph = w * 0.078f
        val right = w - w * 0.05f
        val bottom = h - w * 0.27f
        aiRect.set(right - pw, bottom - ph, right, bottom)
    }

    private fun aiButtonHit(px: Float, py: Float): Boolean {
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0f || h <= 0f) return false
        layOutAi(w, h)
        return aiRect.contains(px, py)
    }

    private fun bombButtonHit(px: Float, py: Float): Boolean {
        val w = width.toFloat()
        val h = height.toFloat()
        val r = w * 0.085f
        val cx = w - r - w * 0.05f
        val cy = h - r - w * 0.06f
        return (px - cx) * (px - cx) + (py - cy) * (py - cy) < r * r * 1.4f
    }

    // ---- drawing ----------------------------------------------------------------------------
    private fun sx(x: Float): Float = width / 2f + x * width / 2f
    private fun sy(y: Float): Float = y * height

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val w = width.toFloat()
        val h = height.toFloat()
        if (w == 0f || h == 0f) return

        drawSky(canvas, w, h)
        layOutPad(w, h)
        if (world.state == SkyWorld.State.RUNNING) drawControlPad(canvas, w)
        canvas.save()
        if (shakeTimer > 0f) {
            canvas.translate(
                (fxRandom.nextFloat() - 0.5f) * shakeTimer * w * 0.04f,
                (fxRandom.nextFloat() - 0.5f) * shakeTimer * w * 0.04f,
            )
        }
        for (f in world.flares) drawFlare(canvas, f, w)
        for (item in world.items) drawPickup(canvas, item, w)
        for (s in world.shots) drawShot(canvas, s, w)
        for (e in world.enemies) if (e.alive) drawFoe(canvas, e, w)
        world.boss?.let { if (it.alive || !it.finished) drawRaider(canvas, it, w, h) }
        if (world.state == SkyWorld.State.RUNNING || world.state == SkyWorld.State.LEVEL_CLEAR) drawPlayer(canvas, w)
        drawParticles(canvas, w)
        drawFloatTexts(canvas, w)
        if (bombTimer > 0f) {
            val r = w * (1f - bombTimer / 0.45f) * 1.4f
            muzzlePaint.shader = RadialGradient(
                sx(world.playerX), sy(world.playerY), max(1f, r),
                intArrayOf(0x00FFFFFF, 0x66FFFFFF, 0x00FFFFFF), floatArrayOf(0f, 0.8f, 1f), Shader.TileMode.CLAMP,
            )
            canvas.drawCircle(sx(world.playerX), sy(world.playerY), max(1f, r), muzzlePaint)
            muzzlePaint.shader = null
        }
        canvas.restore()
        if (flashTimer > 0f) {
            flashPaint.color = flashColor
            flashPaint.alpha = (255 * min(0.55f, flashTimer)).toInt().coerceIn(0, 255)
            canvas.drawRect(0f, 0f, w, h, flashPaint)
        }
        drawHud(canvas, w, h)
    }

    private fun drawSky(canvas: Canvas, w: Float, h: Float) {
        val t = theme()
        skyPaint.shader = LinearGradient(
            0f, 0f, 0f, h, intArrayOf(t.top, t.mid, t.low),
            floatArrayOf(0f, 0.55f, 1f), Shader.TileMode.CLAMP,
        )
        canvas.drawRect(0f, 0f, w, h, skyPaint)

        // stars sit behind the weather; embers ride in front of it
        if (t.ambient == Ambient.STARS) drawMotes(canvas, w, t)

        val lit = boltFlash * boltFlash          // the bolt lights the cloud tops, not just the screen
        for (c in clouds) {
            cloudPaint.color = if (c.far) t.cloudFar else t.cloudNear
            val base = if (c.far) t.alphaFar else t.alphaNear
            cloudPaint.alpha = (base + (255 - base) * lit * 0.75f).toInt().coerceIn(0, 255)
            val r = c.r * w
            rect.set(sx(c.x) - r, sy(c.y) - r * 0.32f, sx(c.x) + r, sy(c.y) + r * 0.32f)
            canvas.drawOval(rect, cloudPaint)
            rect.set(sx(c.x) - r * 0.55f, sy(c.y) - r * 0.5f, sx(c.x) + r * 0.7f, sy(c.y) + r * 0.2f)
            canvas.drawOval(rect, cloudPaint)
        }
        cloudPaint.alpha = 255

        if (t.ambient == Ambient.EMBERS) drawMotes(canvas, w, t)

        seaPaint.shader = LinearGradient(
            0f, h * t.groundFrom, 0f, h,
            intArrayOf(t.ground and 0x00FFFFFF, t.ground), floatArrayOf(0f, 1f), Shader.TileMode.CLAMP,
        )
        canvas.drawRect(0f, h * t.groundFrom, w, h, seaPaint)

        if (boltFlash > 0f) {
            flashPaint.color = t.accent
            flashPaint.alpha = (110 * lit).toInt().coerceIn(0, 255)
            canvas.drawRect(0f, 0f, w, h, flashPaint)
        }
    }

    private fun drawMotes(canvas: Canvas, w: Float, t: Theme) {
        for (m in motes) {
            val twinkle = 0.55f + 0.45f * sin(runTime * 2.6f + m.phase)
            particlePaint.color = t.accent
            particlePaint.alpha = (255f * twinkle * (if (t.ambient == Ambient.EMBERS) 0.85f else 0.7f))
                .toInt().coerceIn(0, 255)
            canvas.drawCircle(sx(m.x), sy(m.y), max(1f, m.r * w), particlePaint)
        }
        particlePaint.alpha = 255
    }

    private fun bankedSprite(canvas: Canvas, bmp: Bitmap, cx: Float, cy: Float, sw: Float, sh: Float, bank: Float, paint: Paint) {
        canvas.save()
        canvas.rotate(bank * BANK_DEGREES, cx, cy)
        rect.set(cx - sw / 2f, cy - sh / 2f, cx + sw / 2f, cy + sh / 2f)
        canvas.drawBitmap(bmp, null, rect, paint)
        canvas.restore()
    }

    /**
     * The steering area: a thumb-sized pad in the bottom corner you can fly from without your own
     * hand covering the fighter. Dragging the plane directly still works, so this is an offer and
     * not a cage -- it is just the only place where a short stroke crosses the whole band.
     */
    private fun drawControlPad(canvas: Canvas, w: Float) {
        val round = w * 0.05f
        padFillPaint.alpha = (34 + 40 * padGlow).toInt().coerceIn(0, 255)
        canvas.drawRoundRect(padRect, round, round, padFillPaint)
        padPaint.strokeWidth = max(1.5f, w * 0.004f)
        padPaint.alpha = (65 + 110 * padGlow).toInt().coerceIn(0, 255)
        canvas.drawRoundRect(padRect, round, round, padPaint)

        // four chevrons pointing out of the pad, so "forward and back too" reads at a glance
        val cx = padRect.centerX()
        val cy = padRect.centerY()
        val tip = min(padRect.width(), padRect.height()) * 0.40f
        val v = w * 0.022f
        padPaint.alpha = (92 + 112 * padGlow).toInt().coerceIn(0, 255)
        padPaint.strokeWidth = max(1.5f, w * 0.006f)
        padPaint.strokeJoin = Paint.Join.ROUND
        chevron(canvas, cx, cy - tip, 0f, -1f, v)
        chevron(canvas, cx, cy + tip, 0f, 1f, v)
        chevron(canvas, cx - tip, cy, -1f, 0f, v)
        chevron(canvas, cx + tip, cy, 1f, 0f, v)

        // the knob rides your thumb and springs back to the middle when you let go
        val kr = w * PAD_KNOB
        padFillPaint.alpha = (95 + 110 * padGlow).toInt().coerceIn(0, 255)
        canvas.drawCircle(padKnobX, padKnobY, kr, padFillPaint)
        padFillPaint.alpha = 255
        padPaint.alpha = (125 + 130 * padGlow).toInt().coerceIn(0, 255)
        padPaint.strokeWidth = max(2f, w * 0.006f)
        canvas.drawCircle(padKnobX, padKnobY, kr, padPaint)
        padPaint.alpha = 255

        // the words are for your first flight only; after that the chevrons say it -- except
        // while the autopilot has the aircraft, when the one thing worth saying is how to take
        // it back
        if (world.ai) {
            label(canvas, context.getString(R.string.ai_flying), cx, padRect.top - w * 0.03f,
                w * 0.032f, color(R.color.hp_full), color(R.color.text_stroke))
        } else if (!padUsed) {
            val caption = context.getString(R.string.control_pad) + " · " +
                context.getString(R.string.control_hint)
            label(canvas, caption, cx, padRect.top - w * 0.03f, w * 0.032f,
                color(R.color.gold), color(R.color.text_stroke))
        }

        // the ceiling of the band, drawn only while you are actually steering into it
        if (bandHint > 0.01f) {
            padPaint.alpha = (115 * bandHint).toInt().coerceIn(0, 255)
            padPaint.strokeWidth = max(1.5f, w * 0.004f)
            val y = sy(SkyWorld.PLAYER_Y_MIN)
            val dash = w * 0.028f
            var x = w * 0.04f
            while (x < w * 0.96f) {
                canvas.drawLine(x, y, min(x + dash, w * 0.96f), y, padPaint)
                x += dash * 2f
            }
            padPaint.alpha = 255
        }
    }

    /** A single arrowhead at ([tx], [ty]) pointing along ([dx], [dy]), drawn with [padPaint]. */
    private fun chevron(canvas: Canvas, tx: Float, ty: Float, dx: Float, dy: Float, v: Float) {
        // the two barbs sit back along the direction of travel and out to either side
        val bx = -dx * v
        val by = -dy * v
        chevronPath.reset()
        chevronPath.moveTo(tx + bx - dy * v, ty + by + dx * v)
        chevronPath.lineTo(tx, ty)
        chevronPath.lineTo(tx + bx + dy * v, ty + by - dx * v)
        canvas.drawPath(chevronPath, padPaint)
    }
    private val chevronPath = Path()

    private fun drawPlayer(canvas: Canvas, w: Float) {
        val cx = sx(world.playerX)
        val cy = sy(world.playerY)
        val sh = w * PLAYER_SIZE
        val sw = sh * 0.8f
        rect.set(cx - sw * 0.34f, cy + sh * 0.3f, cx + sw * 0.34f, cy + sh * 0.44f)
        canvas.drawOval(rect, shadowPaint)
        // blink while the mercy window is running so it is obvious you are not solid yet
        val blink = world.mercy > 0f && ((world.mercy * 14f).toInt() and 1) == 0
        if (!blink) {
            bankedSprite(canvas, playerFrames[frameIndex()], cx, cy, sw, sh, bankOf(), spritePaint)
        }
        // the escorts, drawn behind you so your own aircraft stays the thing you read first
        for (i in 0 until world.wingmen) {
            val wx = sx(world.wingmanX(i))
            val wy = sy(world.wingmanY())
            val wh = w * PLAYER_SIZE * 0.66f
            bankedSprite(canvas, wingmanFrames[frameIndex()], wx, wy, wh * 0.8f, wh, bankOf() * 0.7f, spritePaint)
        }
        // the orbs circling you, drawn over the escorts so you can see what is covering you
        for (i in 0 until world.orbs) {
            val ox = sx(world.orbX(i))
            val oy = sy(world.orbY(i))
            val r = w * SkyWorld.ORBIT_HALF
            muzzlePaint.shader = RadialGradient(
                ox, oy, max(1f, r * 2.2f),
                intArrayOf(0xCC8EE8FF.toInt(), 0x6622D3EE, 0x0022D3EE), null, Shader.TileMode.CLAMP,
            )
            canvas.drawCircle(ox, oy, r * 2.2f, muzzlePaint)
            muzzlePaint.shader = null
            hpPaint.color = color(R.color.shield_ring)
            canvas.drawCircle(ox, oy, r, hpPaint)
        }
        if (world.shield) {
            shieldPaint.strokeWidth = max(2f, w * 0.008f)
            shieldPaint.alpha = (140 + 90 * sin(runTime * 6f)).toInt().coerceIn(0, 255)
            canvas.drawCircle(cx, cy, sh * 0.62f, shieldPaint)
            shieldPaint.alpha = 255
        }
        if (muzzleTimer > 0f) {
            val r = w * 0.035f * (0.5f + muzzleTimer / 0.055f)
            muzzlePaint.shader = RadialGradient(
                cx, cy - sh * 0.45f, r,
                intArrayOf(0xFFFFFFDC.toInt(), 0xCCFDE047.toInt(), 0x00F97316), null, Shader.TileMode.CLAMP,
            )
            canvas.drawCircle(cx, cy - sh * 0.45f, r, muzzlePaint)
            muzzlePaint.shader = null
        }
    }

    private fun frameIndex(): Int = ((runTime * PROP_HZ).toInt()) and 1

    /** The fighter rolls into whichever way you are dragging it, and eases back when you stop. */
    private fun bankOf(): Float {
        val target = ((world.playerX - lastPlayerX) * 26f).coerceIn(-1f, 1f)
        smoothBank += (target - smoothBank) * 0.25f
        return smoothBank
    }
    private var smoothBank = 0f
    private var lastPlayerX = 0f

    private fun drawFoe(canvas: Canvas, e: SkyWorld.Plane, w: Float) {
        val frames = foeFrames[e.kind.ordinal.coerceIn(0, foeFrames.size - 1)]
        val frame = ((runTime * PROP_HZ).toInt() + e.kind.ordinal) and 1
        // drawn at the size it is actually hit at, so a swarm bee looks as small as it is
        val sh = w * FOE_SIZE * (world.halfOf(e.kind) / SkyWorld.ENEMY_HALF)
        val sw = sh * 0.8f
        val hurt = e.hp < e.maxHp
        // a mended one flashes as it comes back up, so you can see the healer undoing your work
        val paint = if (e.mended > 0f && ((e.mended * 22f).toInt() and 1) == 0) {
            mendPaint
        } else if (hurt) {
            hitPaint
        } else {
            spritePaint
        }
        // On the long night you hear them before you see them: they surface out of the dark.
        val dark = SkyWorld.profileOf(world.level).hazard == SkyWorld.Hazard.DARK
        val reveal = if (dark) ((e.y - 0.04f) / 0.26f).coerceIn(0f, 1f) else 1f
        if (reveal <= 0.02f) return
        val base = paint.alpha
        if (reveal < 1f) paint.alpha = (base * reveal).toInt().coerceIn(0, 255)
        bankedSprite(canvas, frames[frame], sx(e.x), sy(e.y), sw, sh, e.bank, paint)
        paint.alpha = base
    }

    /** A column of fire off the burning ground: hot core, ragged crown, smoke going up. */
    private fun drawFlare(canvas: Canvas, f: SkyWorld.Flare, w: Float) {
        val fade = (f.life / f.maxLife).coerceIn(0f, 1f)
        val grow = (1f - fade).coerceIn(0f, 1f)
        val cx = sx(f.x)
        val cy = sy(f.y)
        val rw = w * 0.075f * (0.55f + fade * 0.6f)
        val rh = w * (0.13f + grow * 0.05f) * (0.5f + fade * 0.7f)
        val flick = 0.85f + 0.15f * sin(runTime * 14f + f.phase)
        muzzlePaint.shader = RadialGradient(
            cx, cy, max(1f, rw * 2.1f),
            intArrayOf(0x00000000, 0x33FF8A2B, 0x00000000), floatArrayOf(0f, 0.55f, 1f), Shader.TileMode.CLAMP,
        )
        canvas.drawCircle(cx, cy, max(1f, rw * 2.1f), muzzlePaint)
        muzzlePaint.shader = null
        particlePaint.color = color(R.color.s3_ember)
        particlePaint.alpha = (200 * fade).toInt().coerceIn(0, 255)
        rect.set(cx - rw * flick, cy - rh, cx + rw * flick, cy + rh * 0.45f)
        canvas.drawOval(rect, particlePaint)
        particlePaint.color = Color.WHITE
        particlePaint.alpha = (150 * fade).toInt().coerceIn(0, 255)
        rect.set(cx - rw * 0.38f * flick, cy - rh * 0.6f, cx + rw * 0.38f * flick, cy + rh * 0.2f)
        canvas.drawOval(rect, particlePaint)
        particlePaint.alpha = 255
    }

    private fun drawRaider(canvas: Canvas, b: SkyWorld.Boss, w: Float, h: Float) {
        val frames = raiderFrames[b.kind.coerceIn(0, raiderFrames.size - 1)]
        val frame = ((runTime * PROP_HZ).toInt()) and 1
        val sw = w * RAIDER_SIZE
        val sh = sw * 0.8f
        val cx = sx(b.x)
        val cy = sy(b.y)
        if (b.alive) {
            // it glows red for a beat each time it steps up a phase
            val raging = b.rage > 0f && ((b.rage * 18f).toInt() and 1) == 0
            bankedSprite(canvas, frames[frame], cx, cy, sw, sh, b.bank * 0.5f,
                if (raging) hitPaint else spritePaint)
            drawRaiderBar(canvas, b, w, h, 255)
            return
        }

        // Falling. It rolls over, lights up white at each blast, and burns out at the very end.
        val span = SkyWorld.BOSS_DEATH_SECONDS - SkyWorld.BOSS_AFTERGLOW
        val gone = 1f - ((b.dying - SkyWorld.BOSS_AFTERGLOW) / span).coerceIn(0f, 1f)
        val roll = sin(b.roll * SkyWorld.TAU) * (0.35f + gone * 0.65f)
        val lit = ((b.dying * 26f).toInt() and 1) == 0 && gone < 0.88f
        val paint = if (lit) hitPaint else spritePaint
        val fade = (255 * (1f - ((gone - 0.8f) / 0.2f).coerceIn(0f, 1f))).toInt()
        paint.alpha = fade
        bankedSprite(canvas, frames[frame], cx, cy, sw * (1f - gone * 0.06f), sh, roll, paint)
        paint.alpha = 255
        // it trails fire the whole way down
        val glow = w * 0.11f * (0.6f + sin(runTime * 19f) * 0.25f) * (1f - gone * 0.4f)
        muzzlePaint.shader = RadialGradient(
            cx, cy, max(1f, glow),
            intArrayOf(0xCCFFF1C4.toInt(), 0x88F97316.toInt(), 0x00F97316), null, Shader.TileMode.CLAMP,
        )
        canvas.drawCircle(cx, cy, max(1f, glow), muzzlePaint)
        muzzlePaint.shader = null
        // the bar empties, then gets out of the way
        drawRaiderBar(canvas, b, w, h, (255 * (1f - (gone / 0.25f).coerceIn(0f, 1f))).toInt())
    }

    private fun drawRaiderBar(canvas: Canvas, b: SkyWorld.Boss, w: Float, h: Float, alpha: Int) {
        if (alpha <= 0) return
        // health bar pinned under the status bar so it never fights the aircraft
        val bw = w * 0.76f
        val bh = w * 0.035f
        val by = insetTop + h * 0.075f
        bossHpTrackPaint.alpha = alpha
        rect.set((w - bw) / 2f - 2f, by - 2f, (w + bw) / 2f + 2f, by + bh + 2f)
        canvas.drawRoundRect(rect, bh, bh, bossHpTrackPaint)
        bossHpTrackPaint.alpha = 255
        if (b.hp > 0) {
            bossHpPaint.alpha = alpha
            rect.set((w - bw) / 2f, by, (w - bw) / 2f + bw * (b.hp / max(1, b.maxHp).toFloat()), by + bh)
            canvas.drawRoundRect(rect, bh, bh, bossHpPaint)
            bossHpPaint.alpha = 255
            // ticks where it changes its mind, so the fight reads as three rounds
            padPaint.strokeWidth = max(1.5f, w * 0.004f)
            padPaint.alpha = (alpha * 0.7f).toInt().coerceIn(0, 255)
            for (mark in floatArrayOf(SkyWorld.BOSS_PHASE_2, SkyWorld.BOSS_PHASE_3)) {
                val mx = (w - bw) / 2f + bw * mark
                canvas.drawLine(mx, by, mx, by + bh, padPaint)
            }
            padPaint.alpha = 255
        }
        label(canvas, bossName(b.kind), w / 2f, by + bh / 2f, w * 0.042f,
            Color.WHITE, color(R.color.text_stroke))
    }

    private fun drawShot(canvas: Canvas, s: SkyWorld.Shot, w: Float) {
        if (s.fromPlayer && s.pierce > 0) {
            // a round that will punch through is drawn longer and hotter than one that will not
            tracerPaint.color = color(R.color.s3_ember)
            val len = w * 0.05f
            rect.set(sx(s.x) - w * 0.009f, sy(s.y) - len, sx(s.x) + w * 0.009f, sy(s.y) + len * 0.35f)
            canvas.drawRoundRect(rect, w * 0.009f, w * 0.009f, tracerPaint)
            tracerPaint.color = color(R.color.tracer)
        }
        val r = w * (if (s.fromPlayer) 0.009f else 0.013f)
        val cx = sx(s.x)
        val cy = sy(s.y)
        if (s.fromPlayer) {
            rect.set(cx - r, cy - r * 2.6f, cx + r, cy + r * 2.6f)
            canvas.drawRoundRect(rect, r, r, tracerPaint)
            rect.set(cx - r * 0.42f, cy - r * 2f, cx + r * 0.42f, cy + r * 2f)
            canvas.drawRoundRect(rect, r, r, tracerCorePaint)
        } else {
            canvas.drawCircle(cx, cy, r * 1.25f, foeShotPaint)
            canvas.drawCircle(cx, cy - r * 0.2f, r * 0.55f, foeShotCorePaint)
        }
    }

    private fun drawPickup(canvas: Canvas, item: SkyWorld.Item, w: Float) {
        val bmp = pickupBitmaps[item.kind] ?: return
        val s = w * PICKUP_SIZE * (1f + 0.06f * sin(runTime * 5f + item.x * 8f))
        val cx = sx(item.x)
        val cy = sy(item.y)
        rect.set(cx - s / 2f, cy - s / 2f, cx + s / 2f, cy + s / 2f)
        canvas.drawBitmap(bmp, null, rect, spritePaint)
    }

    private fun drawParticles(canvas: Canvas, w: Float) {
        for (p in particles) {
            particlePaint.color = p.color
            particlePaint.alpha = (255f * (p.life / p.maxLife).coerceIn(0f, 1f)).toInt()
            canvas.drawCircle(sx(p.x), sy(p.y), max(1.5f, p.size * w), particlePaint)
        }
        particlePaint.alpha = 255
    }

    private fun drawFloatTexts(canvas: Canvas, w: Float) {
        for (t in floatTexts) {
            val k = 1f - t.life / t.maxLife
            val alpha = (255f * min(1f, t.life / 0.3f)).toInt()
            fillPaint.alpha = alpha
            strokePaint.alpha = alpha
            label(canvas, t.text, sx(t.x), sy(t.y) - w * 0.12f * k, w * 0.055f, t.color, color(R.color.text_stroke))
            fillPaint.alpha = 255
            strokePaint.alpha = 255
        }
    }

    private fun label(canvas: Canvas, text: String, x: Float, y: Float, size: Float, fill: Int, stroke: Int) {
        fillPaint.textSize = size
        strokePaint.textSize = size
        strokePaint.strokeWidth = max(2f, size * 0.17f)
        val alpha = fillPaint.alpha
        fillPaint.color = fill
        strokePaint.color = stroke
        fillPaint.alpha = alpha
        strokePaint.alpha = alpha
        val baseline = y + size * 0.35f
        canvas.drawText(text, x, baseline, strokePaint)
        canvas.drawText(text, x, baseline, fillPaint)
    }

    // ---- hud --------------------------------------------------------------------------------
    private fun drawHud(canvas: Canvas, w: Float, h: Float) {
        val top = insetTop + h * 0.015f
        label(canvas, world.score.toString(), w * 0.5f, top + w * 0.04f, w * 0.075f, Color.WHITE, color(R.color.text_stroke))
        val stage = stageIndex(world.level)
        val season = (world.level - 1) / stagePlaces.size + 1
        val stageText = if (season > 1) {
            context.getString(R.string.stage_season_label, world.level, season)
        } else {
            context.getString(R.string.stage_label, world.level)
        }
        label(canvas, stageText, w * 0.17f, top + w * 0.035f, w * 0.045f, Color.WHITE, color(R.color.text_stroke))
        label(canvas, context.getString(R.string.best_label, max(bestLevel, world.bestLevel)),
            w * 0.84f, top + w * 0.035f, w * 0.04f, Color.WHITE, color(R.color.text_stroke))

        // hit points as a row of pips, up under the stage name: the bottom band is the
        // steering area now, and a thumb resting on the pad must not cover your own health
        val pip = w * 0.032f
        val gap = pip * 0.6f
        val total = SkyWorld.MAX_HP * pip + (SkyWorld.MAX_HP - 1) * gap
        var px = w * 0.06f
        // clear of the raider's health bar, which hangs at insetTop + h * 0.075 during a boss
        val py = insetTop + h * 0.075f + w * 0.075f
        for (i in 0 until SkyWorld.MAX_HP) {
            hpPaint.color = if (i < world.hp) {
                if (world.hp <= 2) color(R.color.hp_low) else color(R.color.hp_full)
            } else {
                color(R.color.hp_track)
            }
            rect.set(px, py - pip / 2f, px + pip, py + pip / 2f)
            canvas.drawRoundRect(rect, pip * 0.3f, pip * 0.3f, hpPaint)
            px += pip + gap
        }
        drawCombo(canvas, w, py + pip * 1.8f)
        drawEffects(canvas, w, py + pip * 4.6f)

        // bomb button
        val r = w * 0.085f
        val bx = w - r - w * 0.05f
        val by = h - r - w * 0.06f
        panelPaint.alpha = if (world.bombs > 0) 230 else 110
        canvas.drawCircle(bx, by, r, panelPaint)
        panelPaint.alpha = 255
        panelEdgePaint.strokeWidth = max(2f, w * 0.006f)
        canvas.drawCircle(bx, by, r, panelEdgePaint)
        pickupBitmaps[SkyWorld.ItemKind.BOMB]?.let {
            rect.set(bx - r * 0.55f, by - r * 0.62f, bx + r * 0.55f, by + r * 0.48f)
            spritePaint.alpha = if (world.bombs > 0) 255 else 90
            canvas.drawBitmap(it, null, rect, spritePaint)
            spritePaint.alpha = 255
        }
        label(canvas, world.bombs.toString(), bx, by + r * 0.72f, w * 0.042f, Color.WHITE, color(R.color.text_stroke))

        drawBanner(canvas, w, h)
        if (world.state != SkyWorld.State.RUNNING) drawOverlay(canvas, w, h, stage)
        // last, so it stays reachable over a panel: switching the autopilot on is exactly the
        // thing you want to do from the start screen
        drawAiButton(canvas, w, h)
        lastPlayerX = world.playerX
    }

    /**
     * The autopilot switch. A lamp rather than a word for its state, so the pill reads the same
     * whichever language the rest of the screen is in.
     */
    private fun drawAiButton(canvas: Canvas, w: Float, h: Float) {
        layOutAi(w, h)
        val round = aiRect.height() * 0.5f
        panelPaint.alpha = if (world.ai) 245 else 185
        canvas.drawRoundRect(aiRect, round, round, panelPaint)
        panelPaint.alpha = 255
        panelEdgePaint.strokeWidth = max(2f, w * 0.006f)
        canvas.drawRoundRect(aiRect, round, round, panelEdgePaint)
        // the lamp breathes while it is flying, so the pill is alive rather than merely lit
        val pulse = if (world.ai) 0.7f + 0.3f * sin(runTime * 4.2f) else 1f
        hpPaint.color = if (world.ai) color(R.color.hp_full) else color(R.color.hp_track)
        hpPaint.alpha = (255 * pulse).toInt().coerceIn(0, 255)
        canvas.drawCircle(aiRect.left + aiRect.height() * 0.5f, aiRect.centerY(), aiRect.height() * 0.17f, hpPaint)
        hpPaint.alpha = 255
        label(canvas, context.getString(R.string.ai_label), aiRect.centerX() + aiRect.height() * 0.28f,
            aiRect.centerY(), w * 0.044f,
            if (world.ai) color(R.color.gold) else Color.WHITE, color(R.color.text_stroke))
    }

    /**
     * The chain. It only shows once it is actually paying -- below that it would be noise -- and
     * the bar under it is the window you have left to land the next kill.
     */
    private fun drawCombo(canvas: Canvas, w: Float, y: Float) {
        val mult = world.comboMultiplier()
        if (world.combo < SkyWorld.COMBO_STEP || mult < 2) return
        val left = (world.comboTimer / SkyWorld.COMBO_WINDOW).coerceIn(0f, 1f)
        val x = w * 0.06f
        val size = w * (0.052f + comboPop * 0.022f)
        label(canvas, "x${'$'}mult", x + size * 0.45f, y + size, size, color(R.color.gold), color(R.color.text_stroke))
        label(canvas, context.getString(R.string.combo_label), x + size * 1.55f, y + size * 0.97f,
            w * 0.028f, Color.WHITE, color(R.color.text_stroke))
        // the window draining away
        val bw = w * 0.17f
        val bh = w * 0.012f
        val by = y + size * 1.25f
        rect.set(x, by, x + bw, by + bh)
        canvas.drawRoundRect(rect, bh, bh, hpTrackPaint)
        hpPaint.color = if (left < 0.3f) color(R.color.hp_low) else color(R.color.gold)
        rect.set(x, by, x + bw * left, by + bh)
        canvas.drawRoundRect(rect, bh, bh, hpPaint)
    }

    /**
     * What is running right now, as a stack of draining chips. Four things can be on a timer at
     * once, so a single word in the corner no longer says enough.
     */
    private fun drawEffects(canvas: Canvas, w: Float, top: Float) {
        var y = top
        fun chip(nameId: Int, left: Float, span: Float, tint: Int) {
            val cw = w * 0.2f
            val ch = w * 0.036f
            rect.set(w * 0.06f, y, w * 0.06f + cw, y + ch)
            canvas.drawRoundRect(rect, ch / 2f, ch / 2f, hpTrackPaint)
            hpPaint.color = tint
            rect.set(w * 0.06f, y, w * 0.06f + cw * (left / span).coerceIn(0f, 1f), y + ch)
            canvas.drawRoundRect(rect, ch / 2f, ch / 2f, hpPaint)
            label(canvas, context.getString(nameId), w * 0.06f + cw / 2f, y + ch * 0.78f,
                w * 0.029f, Color.WHITE, color(R.color.text_stroke))
            y += ch * 1.22f
        }
        if (world.rapidTimer > 0f) chip(R.string.item_rapid, world.rapidTimer, SkyWorld.RAPID_SECONDS, color(R.color.gold))
        if (world.pierceTimer > 0f) chip(R.string.item_pierce, world.pierceTimer, SkyWorld.PIERCE_SECONDS, color(R.color.s3_ember))
        if (world.homingTimer > 0f) chip(R.string.item_homing, world.homingTimer, SkyWorld.HOMING_SECONDS, color(R.color.hp_low))
        if (world.magnetTimer > 0f) chip(R.string.item_magnet, world.magnetTimer, SkyWorld.MAGNET_SECONDS, color(R.color.shield_ring))
        // the charm is not on a clock: it sits there until something takes it
        if (world.charm) chip(R.string.item_charm, 1f, 1f, color(R.color.gold))
    }

    /** A line across the middle of the sky for the moments that deserve one. */
    private fun drawBanner(canvas: Canvas, w: Float, h: Float) {
        if (bannerTimer <= 0f || banner.isEmpty()) return
        val k = (bannerTimer / 0.35f).coerceIn(0f, 1f)          // eases out at the end
        val rise = (1f - k) * w * 0.05f
        strokePaint.alpha = (255 * k).toInt().coerceIn(0, 255)
        fillPaint.alpha = strokePaint.alpha
        label(canvas, banner, w / 2f, h * 0.36f - rise, w * 0.072f,
            color(R.color.gold), color(R.color.text_stroke))
        strokePaint.alpha = 255
        fillPaint.alpha = 255
    }

    private fun drawOverlay(canvas: Canvas, w: Float, h: Float, stage: Int) {
        val title: String
        val body: String
        val accent: String
        var pre = ""
        when (world.state) {
            SkyWorld.State.READY -> {
                title = stagePlaces[stage]
                body = stageStories[stage] + "\n\n" + context.getString(R.string.course_label) + " · " + courseBits(stage)
                accent = context.getString(R.string.tap_to_start)
            }
            SkyWorld.State.LEVEL_CLEAR -> {
                val next = stageIndex(world.level + 1)
                pre = context.getString(R.string.stage_cleared, world.level)
                title = stageClears[stage]
                body = context.getString(
                    R.string.rank_line, RANKS[world.stageRank()], world.stageHits, world.stageBestCombo,
                ) + "\n" +
                    context.getString(R.string.kills_line, world.kills, world.score) + chainLine() + "\n" +
                    context.getString(R.string.next_up, stagePlaces[next], stageTags[next])
                accent = context.getString(R.string.tap_next_stage)
            }
            else -> {
                title = context.getString(R.string.game_over)
                body = context.getString(R.string.lost_to_foes, stagePlaces[stage]) + "\n" +
                    context.getString(R.string.kills_line, world.kills, world.score) + chainLine() +
                    boonLine() +
                    (if (world.continues == 0) "\n" + context.getString(R.string.continues_spent) else "")
                accent = if (world.continues > 0) {
                    context.getString(R.string.tap_continue, world.level, world.continues)
                } else {
                    context.getString(R.string.tap_to_retry)
                }
            }
        }
        // The clear lines are whole sentences, so the title wraps too -- and drops a size when
        // it has to, rather than running off the side of the panel.
        var titleSize = w * 0.068f
        var titleLines = wrap(title, w * 0.80f, titleSize)
        if (titleLines.size > 1) {
            titleSize = w * 0.054f
            titleLines = wrap(title, w * 0.80f, titleSize)
        }
        val lines = wrap(body, w * 0.78f, w * 0.042f)
        // three cards to pick between, if there are any: they take the room the accent line had
        val cards = world.offered
        val cardH = w * 0.115f
        val cardsH = if (cards.isEmpty()) 0f else cards.size * (cardH + w * 0.022f) + w * 0.05f
        val panelH = h * 0.30f + lines.size * w * 0.052f +
            (titleLines.size - 1) * titleSize * 1.25f + cardsH
        rect.set(w * 0.07f, h * 0.5f - panelH / 2f, w * 0.93f, h * 0.5f + panelH / 2f)
        canvas.drawRoundRect(rect, w * 0.05f, w * 0.05f, panelPaint)
        panelEdgePaint.strokeWidth = max(2f, w * 0.005f)
        canvas.drawRoundRect(rect, w * 0.05f, w * 0.05f, panelEdgePaint)
        var y = rect.top + w * 0.11f
        if (pre.isNotEmpty()) {
            label(canvas, pre, w / 2f, y, w * 0.045f, color(R.color.gold), color(R.color.text_stroke))
            y += w * 0.075f
        }
        for (line in titleLines) {
            label(canvas, line, w / 2f, y, titleSize, Color.WHITE, color(R.color.text_stroke))
            y += titleSize * 1.25f
        }
        y += w * 0.09f - titleSize * 1.25f
        bodyPaint.textSize = w * 0.042f
        for (line in lines) {
            canvas.drawText(line, w / 2f, y, bodyPaint)
            y += w * 0.052f
        }
        y += w * 0.03f
        if (cards.isEmpty()) {
            label(canvas, accent, w / 2f, y, w * 0.05f, color(R.color.gold), color(R.color.text_stroke))
            for (card in boonCards) card.setEmpty()
            return
        }
        label(canvas, context.getString(R.string.pick_one), w / 2f, y, w * 0.045f,
            color(R.color.gold), color(R.color.text_stroke))
        y += w * 0.045f
        for ((i, boon) in cards.withIndex()) {
            val top = y
            val card = boonCards[i]
            card.set(w * 0.11f, top, w * 0.89f, top + cardH)
            canvas.drawRoundRect(card, cardH * 0.28f, cardH * 0.28f, cardPaint)
            panelEdgePaint.strokeWidth = max(2f, w * 0.005f)
            canvas.drawRoundRect(card, cardH * 0.28f, cardH * 0.28f, panelEdgePaint)
            val held = world.boonLevel(boon)
            val name = boonNames[boon.ordinal] + if (held > 0) "  x${'$'}{held + 1}" else ""
            label(canvas, name, card.centerX(), top + cardH * 0.42f, w * 0.042f,
                color(R.color.gold), color(R.color.text_stroke))
            bodyPaint.textSize = w * 0.032f
            canvas.drawText(boonDescs[boon.ordinal], card.centerX(), top + cardH * 0.80f, bodyPaint)
            y += cardH + w * 0.022f
        }
        for (i in cards.size until boonCards.size) boonCards[i].setEmpty()
    }

    /**
     * Breaks [body] to fit [maxWidth] at [textSize], keeping the author's own line breaks.
     * Without this a long victory line runs off the side of the panel on a narrow phone.
     */
    private fun wrap(body: String, maxWidth: Float, textSize: Float): List<String> {
        bodyPaint.textSize = textSize
        val out = ArrayList<String>()
        for (paragraph in body.split("\n")) {
            if (paragraph.isEmpty()) { out.add(""); continue }
            var line = StringBuilder()
            for (word in paragraph.split(" ")) {
                val candidate = if (line.isEmpty()) word else "${'$'}line ${'$'}word"
                if (bodyPaint.measureText(candidate) <= maxWidth || line.isEmpty()) {
                    line = StringBuilder(candidate)
                } else {
                    out.add(line.toString())
                    line = StringBuilder(word)
                }
            }
            out.add(line.toString())
        }
        return out
    }

    /** How far the chain got, if it got anywhere worth saying. */
    /** The boons this run is carrying, for the panel that ends it. */
    private fun boonLine(): String {
        if (world.boons.isEmpty()) return ""
        val names = world.boons.entries
            .sortedBy { it.key.ordinal }
            .joinToString(" · ") { boonNames[it.key.ordinal] + if (it.value > 1) " x${'$'}{it.value}" else "" }
        return "\n" + context.getString(R.string.boon_have, names)
    }

    private fun chainLine(): String =
        if (world.bestCombo < SkyWorld.COMBO_STEP) ""
        else " · " + context.getString(R.string.best_chain, world.bestCombo)

    private fun courseBits(stage: Int): String {
        val profile = SkyWorld.PROFILES[stage]
        val bits = ArrayList<String>()
        if (profile.mix.count { it == SkyWorld.Kind.DRONE || it == SkyWorld.Kind.WEAVER } >= 2) {
            bits.add(context.getString(R.string.course_swarm))
        }
        if (profile.mix.contains(SkyWorld.Kind.GUNNER)) bits.add(context.getString(R.string.course_gunners))
        if (profile.mix.contains(SkyWorld.Kind.DIVER)) bits.add(context.getString(R.string.course_divers))
        if (profile.speed >= 0.36f) bits.add(context.getString(R.string.course_fast))
        return bits.joinToString(" · ")
    }

    companion object {
        private const val PREFS_NAME = "skystrike"
        private const val KEY_BEST_LEVEL = "best_level"
        private const val KEY_BEST_SCORE = "best_score"
        private const val KEY_MUTED = "muted"
        private const val KEY_PAD_USED = "pad_used"
        /** How much the pad multiplies thumb travel. One short stroke should cross the band. */
        private const val PAD_GAIN = 1.55f
        private const val PAD_KNOB = 0.055f
        private const val PLAYER_SIZE = 0.17f
        private const val FOE_SIZE = 0.135f
        private const val RAIDER_SIZE = 0.62f
        private const val PICKUP_SIZE = 0.1f
        private const val PROP_HZ = 22f
        private const val BANK_DEGREES = 18f
        private val RANKS = arrayOf("S", "A", "B", "C")
        private const val HITSTOP_SCALE = 0.05f
        private const val TIME_RECOVERY = 1.1f     // back to full speed in a bit under a second
        private const val SCROLL_SPEED = 0.16f
    }
}
