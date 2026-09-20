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

    private fun play(id: Int, slot: Int, minIntervalMs: Long, volume: Float, rateJitter: Float = 0f) {
        if (muted) return
        val pool = soundPool ?: return
        val now = System.nanoTime()
        if (now - lastPlayedNanos[slot] < minIntervalMs * 1_000_000L) return
        lastPlayedNanos[slot] = now
        val rate = 1f + (fxRandom.nextFloat() * 2f - 1f) * rateJitter
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
    /** Fades the flight-band ceiling in while you are steering, so the limit is visible. */
    private var bandHint = 0f
    private var padUsed = prefs.getBoolean(KEY_PAD_USED, false)
    private val padRect = RectF()

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
    )
    private val raiderFrames: Array<Array<Bitmap>> = arrayOf(
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.raider_0_0), BitmapFactory.decodeResource(resources, R.drawable.raider_0_1)),
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.raider_1_0), BitmapFactory.decodeResource(resources, R.drawable.raider_1_1)),
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.raider_2_0), BitmapFactory.decodeResource(resources, R.drawable.raider_2_1)),
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.raider_3_0), BitmapFactory.decodeResource(resources, R.drawable.raider_3_1)),
    )
    private val pickupBitmaps: Map<SkyWorld.ItemKind, Bitmap> = mapOf(
        SkyWorld.ItemKind.SPREAD to BitmapFactory.decodeResource(resources, R.drawable.pickup_spread),
        SkyWorld.ItemKind.RAPID to BitmapFactory.decodeResource(resources, R.drawable.pickup_rapid),
        SkyWorld.ItemKind.SHIELD to BitmapFactory.decodeResource(resources, R.drawable.pickup_shield),
        SkyWorld.ItemKind.BOMB to BitmapFactory.decodeResource(resources, R.drawable.pickup_bomb),
        SkyWorld.ItemKind.REPAIR to BitmapFactory.decodeResource(resources, R.drawable.pickup_repair),
    )

    private val stagePlaces: Array<String> = resources.getStringArray(R.array.stage_place)
    private val stageRaiders: Array<String> = resources.getStringArray(R.array.stage_raider)
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
            val before = world.state
            world.update(dt)
            world.drainEvents(events)
            for (e in events) handleEvent(e)
            events.clear()
            updateFx(dt)
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
                sparks(e.x, e.y, 16, color(R.color.spark_good), 0.5f, 0.008f)
                sparks(e.x, e.y, 8, color(R.color.smoke), 0.3f, 0.012f)
                shakeTimer = max(shakeTimer, 0.08f)
                play(sndDing, 2, 40, 0.4f, 0.2f)
            }
            SkyWorld.Event.Type.HIT_BOSS -> {
                sparks(e.x, e.y, 3, color(R.color.spark_good), 0.25f)
                play(sndHit, 1, 35, 0.3f, 0.25f)
            }
            SkyWorld.Event.Type.KILL_BOSS -> {
                sparks(e.x, e.y, 60, color(R.color.spark_good), 0.9f, 0.014f)
                sparks(e.x, e.y, 30, color(R.color.smoke), 0.6f, 0.02f)
                shakeTimer = 0.6f
                screenFlash(Color.WHITE, 0.5f)
                floatText(context.getString(R.string.raider_down, stageRaiders[stageIndex(world.level)]), e.x, e.y, color(R.color.gold))
                play(sndBoom, 7, 0, 1f)
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
                floatText(stageRaiders[stageIndex(world.level)], 0f, 0.3f, color(R.color.spark_bad))
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
    }

    private fun updateFx(dt: Float) {
        muzzleTimer = max(0f, muzzleTimer - dt)
        shakeTimer = max(0f, shakeTimer - dt)
        bombTimer = max(0f, bombTimer - dt)
        flashTimer = max(0f, flashTimer - dt * 2.2f)
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
                if (dragPointer < 0) beginDrag(event.getPointerId(i), x, y, w, h)
                when (world.state) {
                    SkyWorld.State.READY -> world.start()
                    SkyWorld.State.LEVEL_CLEAR -> world.nextLevel()
                    SkyWorld.State.GAME_OVER -> world.start()
                    SkyWorld.State.RUNNING -> {}
                }
                performClick()
            }
            MotionEvent.ACTION_MOVE -> {
                val i = event.findPointerIndex(dragPointer)
                if (dragging && i >= 0 && w > 0f && h > 0f) {
                    val x = event.getX(i)
                    val y = event.getY(i)
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
        world.boss?.let { if (it.alive) drawRaider(canvas, it, w, h) }
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

        // the words are for your first flight only; after that the chevrons say it
        if (!padUsed) {
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
            val frame = ((runTime * PROP_HZ).toInt()) and 1
            bankedSprite(canvas, playerFrames[frame], cx, cy, sw, sh, bankOf(), spritePaint)
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
        val sh = w * FOE_SIZE
        val sw = sh * 0.8f
        val hurt = e.hp < e.maxHp
        val paint = if (hurt) hitPaint else spritePaint
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
        bankedSprite(canvas, frames[frame], sx(b.x), sy(b.y), sw, sh, b.bank * 0.5f, spritePaint)
        // health bar pinned under the status bar so it never fights the aircraft
        val bw = w * 0.76f
        val bh = w * 0.035f
        val by = insetTop + h * 0.075f
        rect.set((w - bw) / 2f - 2f, by - 2f, (w + bw) / 2f + 2f, by + bh + 2f)
        canvas.drawRoundRect(rect, bh, bh, bossHpTrackPaint)
        rect.set((w - bw) / 2f, by, (w - bw) / 2f + bw * (b.hp / max(1, b.maxHp).toFloat()), by + bh)
        canvas.drawRoundRect(rect, bh, bh, bossHpPaint)
        label(canvas, stageRaiders[stageIndex(world.level)], w / 2f, by + bh / 2f, w * 0.042f,
            Color.WHITE, color(R.color.text_stroke))
    }

    private fun drawShot(canvas: Canvas, s: SkyWorld.Shot, w: Float) {
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
        if (world.rapidTimer > 0f) {
            label(canvas, context.getString(R.string.item_rapid), w * 0.06f + total / 2f, py + pip * 1.7f,
                w * 0.035f, color(R.color.gold), color(R.color.text_stroke))
        }

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

        if (world.state != SkyWorld.State.RUNNING) drawOverlay(canvas, w, h, stage)
        lastPlayerX = world.playerX
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
                body = context.getString(R.string.kills_line, world.kills, world.score) + "\n" +
                    context.getString(R.string.next_up, stagePlaces[next], stageTags[next])
                accent = context.getString(R.string.tap_next_stage)
            }
            else -> {
                title = context.getString(R.string.game_over)
                body = context.getString(R.string.lost_to_foes, stagePlaces[stage]) + "\n" +
                    context.getString(R.string.kills_line, world.kills, world.score)
                accent = context.getString(R.string.tap_to_retry)
            }
        }
        val lines = body.split("\n")
        val panelH = h * 0.30f + lines.size * w * 0.052f
        rect.set(w * 0.07f, h * 0.5f - panelH / 2f, w * 0.93f, h * 0.5f + panelH / 2f)
        canvas.drawRoundRect(rect, w * 0.05f, w * 0.05f, panelPaint)
        panelEdgePaint.strokeWidth = max(2f, w * 0.005f)
        canvas.drawRoundRect(rect, w * 0.05f, w * 0.05f, panelEdgePaint)
        var y = rect.top + w * 0.11f
        if (pre.isNotEmpty()) {
            label(canvas, pre, w / 2f, y, w * 0.045f, color(R.color.gold), color(R.color.text_stroke))
            y += w * 0.075f
        }
        label(canvas, title, w / 2f, y, w * 0.068f, Color.WHITE, color(R.color.text_stroke))
        y += w * 0.09f
        bodyPaint.textSize = w * 0.042f
        for (line in lines) {
            canvas.drawText(line, w / 2f, y, bodyPaint)
            y += w * 0.052f
        }
        y += w * 0.03f
        label(canvas, accent, w / 2f, y, w * 0.05f, color(R.color.gold), color(R.color.text_stroke))
    }

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
        private const val SCROLL_SPEED = 0.16f
    }
}
