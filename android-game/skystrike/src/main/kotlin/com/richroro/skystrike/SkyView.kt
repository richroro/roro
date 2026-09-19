package com.richroro.skystrike

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LightingColorFilter
import android.graphics.LinearGradient
import android.graphics.Paint
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
    private var dragging = false

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
    }

    // ---- input ------------------------------------------------------------------------------
    override fun onTouchEvent(event: MotionEvent): Boolean {
        val w = width.toFloat()
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                lastTouchX = event.x
                dragging = true
                if (!running) resume()
                if (bombButtonHit(event.x, event.y)) {
                    dragging = false
                    world.useBomb()
                    return true
                }
                when (world.state) {
                    SkyWorld.State.READY -> world.start()
                    SkyWorld.State.LEVEL_CLEAR -> world.nextLevel()
                    SkyWorld.State.GAME_OVER -> world.start()
                    SkyWorld.State.RUNNING -> {}
                }
                performClick()
            }
            MotionEvent.ACTION_MOVE -> if (dragging && w > 0f) {
                world.movePlayerBy((event.x - lastTouchX) / (w * 0.5f))
                lastTouchX = event.x
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> dragging = false
        }
        return true
    }

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
        canvas.save()
        if (shakeTimer > 0f) {
            canvas.translate(
                (fxRandom.nextFloat() - 0.5f) * shakeTimer * w * 0.04f,
                (fxRandom.nextFloat() - 0.5f) * shakeTimer * w * 0.04f,
            )
        }
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
                sx(world.playerX), sy(SkyWorld.PLAYER_Y), max(1f, r),
                intArrayOf(0x00FFFFFF, 0x66FFFFFF, 0x00FFFFFF), floatArrayOf(0f, 0.8f, 1f), Shader.TileMode.CLAMP,
            )
            canvas.drawCircle(sx(world.playerX), sy(SkyWorld.PLAYER_Y), max(1f, r), muzzlePaint)
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
        skyPaint.shader = LinearGradient(
            0f, 0f, 0f, h,
            intArrayOf(color(R.color.sky_top), color(R.color.sky_mid), color(R.color.sky_low)),
            floatArrayOf(0f, 0.55f, 1f), Shader.TileMode.CLAMP,
        )
        canvas.drawRect(0f, 0f, w, h, skyPaint)
        for (c in clouds) {
            cloudPaint.color = if (c.far) color(R.color.cloud_far) else color(R.color.cloud)
            cloudPaint.alpha = if (c.far) 70 else 120
            val r = c.r * w
            rect.set(sx(c.x) - r, sy(c.y) - r * 0.32f, sx(c.x) + r, sy(c.y) + r * 0.32f)
            canvas.drawOval(rect, cloudPaint)
            rect.set(sx(c.x) - r * 0.55f, sy(c.y) - r * 0.5f, sx(c.x) + r * 0.7f, sy(c.y) + r * 0.2f)
            canvas.drawOval(rect, cloudPaint)
        }
        cloudPaint.alpha = 255
        seaPaint.shader = LinearGradient(
            0f, h * 0.82f, 0f, h,
            intArrayOf(0x00000000, color(R.color.sea)), floatArrayOf(0f, 1f), Shader.TileMode.CLAMP,
        )
        canvas.drawRect(0f, h * 0.82f, w, h, seaPaint)
    }

    private fun bankedSprite(canvas: Canvas, bmp: Bitmap, cx: Float, cy: Float, sw: Float, sh: Float, bank: Float, paint: Paint) {
        canvas.save()
        canvas.rotate(bank * BANK_DEGREES, cx, cy)
        rect.set(cx - sw / 2f, cy - sh / 2f, cx + sw / 2f, cy + sh / 2f)
        canvas.drawBitmap(bmp, null, rect, paint)
        canvas.restore()
    }

    private fun drawPlayer(canvas: Canvas, w: Float) {
        val cx = sx(world.playerX)
        val cy = sy(SkyWorld.PLAYER_Y)
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
        bankedSprite(canvas, frames[frame], sx(e.x), sy(e.y), sw, sh, e.bank, if (hurt) hitPaint else spritePaint)
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

        // hit points as a row of pips
        val pip = w * 0.032f
        val gap = pip * 0.6f
        val total = SkyWorld.MAX_HP * pip + (SkyWorld.MAX_HP - 1) * gap
        var px = w * 0.06f
        val py = h - w * 0.055f
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
            label(canvas, context.getString(R.string.item_rapid), w * 0.06f + total / 2f, py - pip * 1.8f,
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
        private const val PLAYER_SIZE = 0.17f
        private const val FOE_SIZE = 0.135f
        private const val RAIDER_SIZE = 0.62f
        private const val PICKUP_SIZE = 0.1f
        private const val PROP_HZ = 22f
        private const val BANK_DEGREES = 18f
        private const val SCROLL_SPEED = 0.16f
    }
}
