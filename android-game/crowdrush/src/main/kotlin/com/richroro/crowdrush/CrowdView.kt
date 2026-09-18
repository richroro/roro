package com.richroro.crowdrush

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
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.sqrt

/** Pseudo-3D renderer for [CrowdWorld] on a plain Canvas. */
class CrowdView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : View(context, attrs) {

    private val world = CrowdWorld(seed = (System.currentTimeMillis() % 1_000_000L).toInt() + 1)
    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private var bestLevel = prefs.getInt(KEY_BEST_LEVEL, 0)
    private var muted = prefs.getBoolean(KEY_MUTED, false)

    // ---- sound (short WAVs from tools/generate_sounds.py, played through SoundPool) ----
    private val soundPool: SoundPool = SoundPool.Builder()
        .setMaxStreams(8)
        .setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_GAME)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build(),
        )
        .build()
    private val sndShot = soundPool.load(context, R.raw.sfx_shot, 1)
    private val sndHit = soundPool.load(context, R.raw.sfx_hit, 1)
    private val sndDing = soundPool.load(context, R.raw.sfx_ding, 1)
    private val sndBuzz = soundPool.load(context, R.raw.sfx_buzz, 1)
    private val sndClear = soundPool.load(context, R.raw.sfx_clear, 1)
    private val sndOver = soundPool.load(context, R.raw.sfx_over, 1)
    private val sndPickup = soundPool.load(context, R.raw.sfx_pickup, 1)
    private val sndBoom = soundPool.load(context, R.raw.sfx_boom, 1)
    private val lastPlayedNanos = LongArray(8)
    private val itemPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val itemRingPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE; style = Paint.Style.STROKE }
    private val emojiPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textAlign = Paint.Align.CENTER }

    // ---- visual effects ----
    private class Particle(var x: Float, var z: Float, var dy: Float, var vy: Float, var vx: Float, var vz: Float, var life: Float, val maxLife: Float, val color: Int, val size: Float)
    private class FloatText(val text: String, val x: Float, val z: Float, var life: Float, val maxLife: Float, val color: Int)
    private val particles = ArrayList<Particle>()
    private val floatTexts = ArrayList<FloatText>()
    private val events = ArrayList<CrowdWorld.Event>()
    private var muzzleTimer = 0f
    private var muzzleX = 0f
    private val fxRandom = java.util.Random()
    private val particlePaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val muzzlePaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val muteBgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0x590F172A }
    private val muteRect = RectF()

    private var running = false
    private var lastFrameNanos = 0L
    private var runTime = 0f
    private var insetTop = 0f
    private var lastTouchX = 0f

    private val skyPaint = Paint()
    private val groundPaint = Paint().apply { color = color(R.color.ground) }
    private val roadPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = color(R.color.road) }
    private val wallPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = color(R.color.wall) }
    private val stripePaint = Paint().apply { color = 0x59FFFFFF; strokeWidth = 1f }
    // Soldier sprites (64x80 PNGs drawn by tools/generate_sprites.py). The player army is seen
    // from behind; enemies face the camera.
    private val allyFrames: Array<Bitmap> = arrayOf(
        BitmapFactory.decodeResource(resources, R.drawable.soldier_blue_back_0),
        BitmapFactory.decodeResource(resources, R.drawable.soldier_blue_back_1),
    )
    private val enemyFrames: Array<Bitmap> = arrayOf(
        BitmapFactory.decodeResource(resources, R.drawable.soldier_red_front_0),
        BitmapFactory.decodeResource(resources, R.drawable.soldier_red_front_1),
    )
    private val spritePaint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)
    private val hitSpritePaint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG).apply {
        colorFilter = LightingColorFilter(0xFFFFB366.toInt(), 0x00331100)
    }
    private val bossBandPaint = Paint().apply { color = color(R.color.boss_band) }
    private val shadowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0x40000000 }
    private val gateGoodPaint = Paint().apply { color = color(R.color.gate_good) }
    private val gateBadPaint = Paint().apply { color = color(R.color.gate_bad) }
    private val gateUsedPaint = Paint().apply { color = color(R.color.gate_used) }
    private val gatePostGoodPaint = Paint().apply { color = color(R.color.gate_post_good) }
    private val gatePostBadPaint = Paint().apply { color = color(R.color.gate_post_bad) }
    private val overlayPaint = Paint().apply { color = color(R.color.overlay) }
    private val barBackPaint = Paint().apply { color = 0x590F172A }
    private val barPaint = Paint().apply { color = color(R.color.gold) }
    private val bulletPaint = Paint().apply { color = color(R.color.bullet) }
    private val bulletEdgePaint = Paint().apply { color = color(R.color.bullet_edge) }
    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        typeface = Typeface.DEFAULT_BOLD
        textAlign = Paint.Align.CENTER
    }
    private val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        typeface = Typeface.DEFAULT_BOLD
        textAlign = Paint.Align.CENTER
        style = Paint.Style.STROKE
        strokeJoin = Paint.Join.ROUND
    }
    private val bodyPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = color(R.color.text)
        textAlign = Paint.Align.CENTER
    }

    private val path = Path()
    private val rect = RectF()

    private val frameCallback = object : Choreographer.FrameCallback {
        override fun doFrame(frameTimeNanos: Long) {
            if (!running) return
            val dt = if (lastFrameNanos == 0L) 0f else (frameTimeNanos - lastFrameNanos) / 1_000_000_000f
            lastFrameNanos = frameTimeNanos
            runTime += dt
            val before = world.state
            world.update(dt)
            world.drainEvents(events)
            for (event in events) handleEvent(event)
            events.clear()
            updateFx(dt)
            if (before == CrowdWorld.State.RUNNING && world.state != CrowdWorld.State.RUNNING) onRunEnded()
            invalidate()
            Choreographer.getInstance().postFrameCallback(this)
        }
    }

    init {
        isFocusable = true
        isClickable = true
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
        resume()
    }

    override fun onDetachedFromWindow() {
        pause()
        soundPool.release()
        super.onDetachedFromWindow()
    }

    // ---- effects & sound -------------------------------------------------------------------

    private fun play(id: Int, slot: Int, minIntervalMs: Long, volume: Float, rateJitter: Float = 0f) {
        if (muted) return
        val now = System.nanoTime()
        if (now - lastPlayedNanos[slot] < minIntervalMs * 1_000_000L) return
        lastPlayedNanos[slot] = now
        val rate = 1f + (fxRandom.nextFloat() * 2f - 1f) * rateJitter
        soundPool.play(id, volume, volume, 1, 0, rate)
    }

    private fun sparks(x: Float, z: Float, n: Int, color: Int, spread: Float) {
        repeat(n) {
            particles.add(
                Particle(
                    x = x + (fxRandom.nextFloat() - 0.5f) * spread, z = z, dy = 0.04f,
                    vy = 0.08f + fxRandom.nextFloat() * 0.14f, vx = (fxRandom.nextFloat() - 0.5f) * 0.9f,
                    vz = (fxRandom.nextFloat() - 0.3f) * 4f, life = 0.35f + fxRandom.nextFloat() * 0.2f, maxLife = 0.5f,
                    color = color, size = 0.008f + fxRandom.nextFloat() * 0.006f,
                ),
            )
        }
    }

    private fun floatText(text: String, x: Float, z: Float, color: Int) {
        floatTexts.add(FloatText(text, x, z, 0.8f, 0.8f, color))
    }

    private fun handleEvent(e: CrowdWorld.Event) {
        val sparkGood = color(R.color.spark_good)
        val sparkBad = color(R.color.spark_bad)
        val gold = color(R.color.bullet)
        when (e.type) {
            CrowdWorld.Event.Type.SHOT -> {
                muzzleTimer = 0.06f
                muzzleX = e.x
                play(sndShot, 0, 70, 0.6f, 0.12f)
            }
            CrowdWorld.Event.Type.HIT_GATE -> {
                val good = e.value == 1
                sparks(e.x, e.z, 3, if (good) sparkGood else sparkBad, 0.05f)
                if (e.flag) {
                    floatText(e.label, if (e.x < 0f) -0.5f else 0.5f, e.z, if (good) gold else sparkBad)
                    play(sndDing, 2, 80, 0.5f)
                } else {
                    play(sndHit, 1, 50, 0.3f, 0.2f)
                }
            }
            CrowdWorld.Event.Type.HIT_ENEMY, CrowdWorld.Event.Type.HIT_BOSS -> {
                sparks(e.x, e.z, if (e.flag) 10 else 3, sparkBad, 0.15f)
                if (e.flag) play(sndDing, 2, 80, 0.5f) else play(sndHit, 1, 50, 0.3f, 0.2f)
            }
            CrowdWorld.Event.Type.GATE_GOOD -> {
                floatText(e.label, e.x, e.z, gold)
                sparks(e.x, e.z, 12, sparkGood, 0.4f)
                play(sndDing, 2, 80, 0.7f)
            }
            CrowdWorld.Event.Type.GATE_BAD -> {
                floatText(e.label, e.x, e.z, sparkBad)
                play(sndBuzz, 3, 150, 0.7f)
            }
            CrowdWorld.Event.Type.CONTACT -> {
                floatText("-" + e.value, e.x, e.z, sparkBad)
                sparks(e.x, e.z, 14, sparkBad, 0.4f)
                play(sndBuzz, 3, 150, 0.7f)
            }
            CrowdWorld.Event.Type.ITEM -> {
                val kind = e.item ?: return
                floatText(itemGlyph(kind) + " " + context.getString(itemName(kind)), e.x, e.z, itemColor(kind))
                sparks(e.x, e.z, 12, itemColor(kind), 0.3f)
                if (kind == CrowdWorld.ItemKind.BOMB) play(sndBoom, 7, 0, 0.9f) else play(sndPickup, 6, 0, 0.7f)
            }
            CrowdWorld.Event.Type.SHIELD_USED -> {
                floatText(context.getString(R.string.shield_blocked), e.x, e.z, color(R.color.item_shield))
                sparks(e.x, e.z, 16, color(R.color.item_shield), 0.5f)
                play(sndPickup, 6, 0, 0.7f)
            }
            CrowdWorld.Event.Type.LEVEL_CLEAR -> play(sndClear, 4, 0, 0.8f)
            CrowdWorld.Event.Type.GAME_OVER -> play(sndOver, 5, 0, 0.8f)
        }
    }

    private fun itemGlyph(kind: CrowdWorld.ItemKind): String = when (kind) {
        CrowdWorld.ItemKind.RAPID -> "⚡"
        CrowdWorld.ItemKind.SHIELD -> "🛡"
        CrowdWorld.ItemKind.REINFORCE -> "✚"
        CrowdWorld.ItemKind.BOMB -> "💣"
    }

    private fun itemName(kind: CrowdWorld.ItemKind): Int = when (kind) {
        CrowdWorld.ItemKind.RAPID -> R.string.item_rapid
        CrowdWorld.ItemKind.SHIELD -> R.string.item_shield
        CrowdWorld.ItemKind.REINFORCE -> R.string.item_reinforce
        CrowdWorld.ItemKind.BOMB -> R.string.item_bomb
    }

    private fun itemColor(kind: CrowdWorld.ItemKind): Int = when (kind) {
        CrowdWorld.ItemKind.RAPID -> color(R.color.item_rapid)
        CrowdWorld.ItemKind.SHIELD -> color(R.color.item_shield)
        CrowdWorld.ItemKind.REINFORCE -> color(R.color.item_reinforce)
        CrowdWorld.ItemKind.BOMB -> color(R.color.item_bomb)
    }

    private fun drawItem(canvas: Canvas, item: CrowdWorld.Item, d: Float) {
        val f = factor(d)
        if (f < 0.05f) return
        val w = width.toFloat()
        val r = w * 0.06f * f
        val x = screenX(item.x, f)
        val ground = screenY(f)
        val y = ground - r * 1.3f - abs(sin(runTime * 3f + item.z)) * r * 0.5f
        rect.set(x - r * 0.9f, ground - r * 0.3f, x + r * 0.9f, ground + r * 0.3f)
        canvas.drawOval(rect, shadowPaint)
        itemPaint.color = itemColor(item.kind)
        canvas.drawCircle(x, y, r, itemPaint)
        itemRingPaint.strokeWidth = max(1.5f, r * 0.14f)
        canvas.drawCircle(x, y, r, itemRingPaint)
        emojiPaint.textSize = r * 1.1f
        canvas.drawText(itemGlyph(item.kind), x, y + r * 0.4f, emojiPaint)
    }

    private fun updateFx(dt: Float) {
        muzzleTimer = max(0f, muzzleTimer - dt)
        val pi = particles.iterator()
        while (pi.hasNext()) {
            val p = pi.next()
            p.life -= dt
            if (p.life <= 0f) { pi.remove(); continue }
            p.x += p.vx * dt
            p.z += p.vz * dt
            p.dy += p.vy * dt
            p.vy -= 0.5f * dt
        }
        val ti = floatTexts.iterator()
        while (ti.hasNext()) {
            val t = ti.next()
            t.life -= dt
            if (t.life <= 0f) ti.remove()
        }
    }

    private fun drawFx(canvas: Canvas, w: Float) {
        for (p in particles) {
            val d = p.z - world.z
            if (d < -4f || d > VIEW_DISTANCE) continue
            val f = factor(d)
            particlePaint.color = p.color
            particlePaint.alpha = (255f * (p.life / p.maxLife).coerceIn(0f, 1f)).toInt()
            canvas.drawCircle(screenX(p.x, f), screenY(f) - p.dy * w * f * 2.2f, max(1.5f, p.size * w * f * 2f), particlePaint)
        }
        for (t in floatTexts) {
            val d = t.z - world.z
            if (d < -4f || d > VIEW_DISTANCE) continue
            val f = factor(d)
            val k = 1f - t.life / t.maxLife
            val alpha = (255f * min(1f, t.life / 0.3f)).toInt()
            fillPaint.alpha = alpha
            strokePaint.alpha = alpha
            label(canvas, t.text, screenX(t.x, f), screenY(f) - w * (0.12f + k * 0.12f) * f - w * 0.02f, max(10f, w * 0.07f * f), t.color, color(R.color.text_stroke))
            fillPaint.alpha = 255
            strokePaint.alpha = 255
        }
        if (muzzleTimer > 0f) {
            val f = factor(0f)
            val rpx = w * LANE_HALF_PX * world.playerRadius
            val mx = screenX(muzzleX, f)
            val my = screenY(f) - rpx * 0.2f - rpx * 0.55f - w * 0.02f
            val r = w * 0.03f * (0.6f + muzzleTimer / 0.06f)
            muzzlePaint.shader = RadialGradient(
                mx, my, r,
                intArrayOf(0xF2FFFFDC.toInt(), 0xCCFDE047.toInt(), 0x00F97316),
                floatArrayOf(0f, 0.4f, 1f), Shader.TileMode.CLAMP,
            )
            canvas.drawCircle(mx, my, r, muzzlePaint)
        }
    }

    private fun toggleMute() {
        muted = !muted
        prefs.edit().putBoolean(KEY_MUTED, muted).apply()
        if (!muted) play(sndDing, 2, 0, 0.5f)
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        if (w == 0 || h == 0) return
        skyPaint.shader = LinearGradient(
            0f, 0f, 0f, h * HORIZON,
            color(R.color.sky_top), color(R.color.sky_bottom),
            Shader.TileMode.CLAMP,
        )
        bodyPaint.textSize = w * 0.045f
    }

    override fun onApplyWindowInsets(insets: WindowInsets): WindowInsets {
        insetTop = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout()).top.toFloat()
        } else {
            @Suppress("DEPRECATION")
            insets.systemWindowInsetTop.toFloat()
        }
        return super.onApplyWindowInsets(insets)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                lastTouchX = event.x
                if (muteRect.contains(event.x, event.y)) {
                    toggleMute()
                    performClick()
                    return true
                }
                when (world.state) {
                    CrowdWorld.State.READY, CrowdWorld.State.GAME_OVER -> world.start()
                    CrowdWorld.State.LEVEL_CLEAR -> world.nextLevel()
                    CrowdWorld.State.RUNNING -> Unit
                }
                if (!running) resume()
                performClick()
            }
            MotionEvent.ACTION_MOVE -> {
                if (world.state == CrowdWorld.State.RUNNING && width > 0) {
                    world.movePlayerBy((event.x - lastTouchX) / (width * LANE_HALF_PX))
                }
                lastTouchX = event.x
            }
        }
        return true
    }

    override fun performClick(): Boolean {
        super.performClick()
        return true
    }

    private fun onRunEnded() {
        if (world.bestLevel > bestLevel) {
            bestLevel = world.bestLevel
            prefs.edit().putInt(KEY_BEST_LEVEL, bestLevel).apply()
        }
        performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
    }

    // ---- projection helpers -------------------------------------------------------------

    /** Scale factor for something [d] metres ahead of the crowd. */
    private fun factor(d: Float): Float = 1f / (1f + max(0f, d) * DEPTH_K)

    private fun screenY(f: Float): Float {
        val h = height.toFloat()
        return h * HORIZON + (h * BASE_Y - h * HORIZON) * f
    }

    private fun screenX(x: Float, f: Float): Float = width / 2f + x * width * LANE_HALF_PX * f

    // ---- drawing ------------------------------------------------------------------------

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val w = width.toFloat()
        val h = height.toFloat()
        if (w == 0f || h == 0f) return

        drawLane(canvas, w, h)

        // far-to-near painter's order
        val drawables = ArrayList<Pair<Float, () -> Unit>>()
        for (g in world.gates) {
            val d = g.z - world.z
            if (d > -4f && d < VIEW_DISTANCE) drawables.add(d to { drawGate(canvas, g, d) })
        }
        for (e in world.enemies) {
            val d = e.z - world.z
            if (e.alive && d > -4f && d < VIEW_DISTANCE) drawables.add(d to { drawEnemy(canvas, e, d) })
        }
        world.boss?.let { b ->
            val d = b.z - world.z
            if (b.alive && d > -4f && d < VIEW_DISTANCE) drawables.add(d to { drawBoss(canvas, b, d) })
        }
        for (item in world.items) {
            val d = item.z - world.z
            if (item.alive && d > -4f && d < VIEW_DISTANCE) drawables.add(d to { drawItem(canvas, item, d) })
        }
        for (bullet in world.bullets) {
            val d = bullet.z - world.z
            if (d > -4f && d < VIEW_DISTANCE) drawables.add(d to { drawBullet(canvas, bullet, d) })
        }
        drawables.sortByDescending { it.first }
        for (item in drawables) item.second()

        drawPlayer(canvas, w)
        drawFx(canvas, w)
        drawHud(canvas, w, h)
        drawOverlay(canvas, w, h)
    }

    private fun drawLane(canvas: Canvas, w: Float, h: Float) {
        canvas.drawRect(0f, 0f, w, h * HORIZON + 1f, skyPaint)
        canvas.drawRect(0f, h * HORIZON, w, h, groundPaint)
        val farF = factor(VIEW_DISTANCE)
        val nearF = factor(-3f)
        val farY = screenY(farF)
        val nearY = screenY(nearF)

        path.reset()
        path.moveTo(screenX(-1f, nearF), nearY)
        path.lineTo(screenX(1f, nearF), nearY)
        path.lineTo(screenX(1f, farF), farY)
        path.lineTo(screenX(-1f, farF), farY)
        path.close()
        canvas.drawPath(path, roadPaint)

        var z = -(world.z % STRIPE_SPACING)
        while (z < VIEW_DISTANCE) {
            val f = factor(z)
            val y = screenY(f)
            canvas.drawLine(screenX(-1f, f), y, screenX(1f, f), y, stripePaint)
            z += STRIPE_SPACING
        }

        for (side in floatArrayOf(-1f, 1f)) {
            path.reset()
            path.moveTo(screenX(side, nearF), nearY)
            path.lineTo(screenX(side, farF), farY)
            path.lineTo(screenX(side, farF), farY - 6f * farF)
            path.lineTo(screenX(side, nearF), nearY - w * WALL_HEIGHT)
            path.close()
            canvas.drawPath(path, wallPaint)
        }
    }

    private val crowdXs = FloatArray(MAX_DRAWN_UNITS)
    private val crowdYs = FloatArray(MAX_DRAWN_UNITS)

    /**
     * Draws up to [MAX_DRAWN_UNITS] soldiers. The player army is a spiral blob; enemy squads
     * stand in ranks ([grid]). Each soldier alternates between the two walk frames.
     */
    private fun drawCrowd(canvas: Canvas, cx: Float, cy: Float, count: Int, radiusPx: Float, frames: Array<Bitmap>, paint: Paint, grid: Boolean) {
        val n = min(count, MAX_DRAWN_UNITS)
        val unit = max(3f, radiusPx * 0.34f)
        val sh = unit * 3.6f
        val sw = sh * 0.8f
        if (grid) {
            val cols = max(1, kotlin.math.ceil(sqrt(n * 1.6f)).toInt())
            val rows = (n + cols - 1) / cols
            val spacingX = min(sw * 1.05f, radiusPx * 2f / cols)
            val spacingY = unit * 1.35f
            for (i in 0 until n) {
                val col = i % cols
                val row = i / cols
                val jitter = ((i * 7919) % 13) / 13f - 0.5f
                crowdXs[i] = cx + (col - (cols - 1) / 2f) * spacingX + jitter * spacingX * 0.25f
                crowdYs[i] = cy + (row - (rows - 1) / 2f) * spacingY
            }
        } else {
            for (i in 0 until n) {
                val angle = i * GOLDEN_ANGLE
                val r = radiusPx * sqrt((i + 0.5f) / max(n, 6).toFloat()) * 0.95f
                crowdXs[i] = cx + cos(angle) * r
                crowdYs[i] = cy + sin(angle) * r * 0.55f
            }
        }
        // painter's order: soldiers lower on screen are nearer and drawn last
        for (i in (0 until n).sortedBy { crowdYs[it] }) {
            val x = crowdXs[i]
            val feet = crowdYs[i] + unit
            val bob = abs(sin(runTime * 12f + i)) * unit * 0.25f
            val frame = ((runTime * 8f).toInt() + i) and 1
            rect.set(x - sw * 0.42f, feet - unit * 0.28f, x + sw * 0.42f, feet + unit * 0.28f)
            canvas.drawOval(rect, shadowPaint)
            rect.set(x - sw / 2f, feet - sh - bob, x + sw / 2f, feet - bob)
            canvas.drawBitmap(frames[frame], null, rect, paint)
        }
    }

    private fun label(canvas: Canvas, text: String, x: Float, y: Float, size: Float, fill: Int, stroke: Int) {
        fillPaint.textSize = size
        strokePaint.textSize = size
        strokePaint.strokeWidth = max(2f, size * 0.16f)
        val alpha = fillPaint.alpha
        fillPaint.color = fill
        strokePaint.color = stroke
        fillPaint.alpha = alpha
        strokePaint.alpha = alpha
        val baseline = y + size * 0.35f
        canvas.drawText(text, x, baseline, strokePaint)
        canvas.drawText(text, x, baseline, fillPaint)
    }

    private fun drawGate(canvas: Canvas, g: CrowdWorld.Gate, d: Float) {
        val f = factor(d)
        if (f < 0.05f) return
        val w = width.toFloat()
        val y = screenY(f)
        val gh = w * 0.16f * f
        drawGateSide(canvas, g.left, g.used, -1f, 0f, f, y, gh, w)
        drawGateSide(canvas, g.right, g.used, 0f, 1f, f, y, gh, w)
    }

    private fun drawGateSide(
        canvas: Canvas, side: CrowdWorld.GateSide, used: Boolean,
        xFrom: Float, xTo: Float, f: Float, y: Float, gh: Float, w: Float,
    ) {
        val x0 = screenX(xFrom, f) + 4f * f
        val x1 = screenX(xTo, f) - 4f * f
        val panel = if (used) gateUsedPaint else if (side.isGood) gateGoodPaint else gateBadPaint
        canvas.drawRect(x0, y - gh, x1, y, panel)
        val post = if (side.isGood) gatePostGoodPaint else gatePostBadPaint
        val postW = 3f * f + 1f
        canvas.drawRect(x0, y - gh, x0 + postW, y, post)
        canvas.drawRect(x1 - postW, y - gh, x1, y, post)
        label(
            canvas, side.label, (x0 + x1) / 2f, y - gh / 2f, max(8f, w * 0.075f * f),
            Color.WHITE, if (side.isGood) color(R.color.gate_post_good) else color(R.color.gate_post_bad),
        )
    }

    private fun drawEnemy(canvas: Canvas, e: CrowdWorld.Enemy, d: Float) {
        val f = factor(d)
        if (f < 0.05f) return
        val w = width.toFloat()
        val y = screenY(f)
        val rpx = w * LANE_HALF_PX * f * (CrowdWorld.ENEMY_HALF_WIDTH * 0.9f)
        val cx = screenX(e.x, f)
        drawCrowd(canvas, cx, y - rpx * 0.3f, e.count, rpx, enemyFrames, spritePaint, grid = true)
        label(canvas, e.count.toString(), cx, y - rpx * 0.3f - rpx * 1.1f - w * 0.03f * f, max(8f, w * 0.07f * f), Color.WHITE, color(R.color.gate_post_bad))
    }

    private fun drawBullet(canvas: Canvas, bullet: CrowdWorld.Bullet, d: Float) {
        val f = factor(d)
        if (f < 0.05f) return
        val w = width.toFloat()
        val bw = max(2f, w * 0.012f * f)
        val bh = max(4f, w * 0.035f * f)
        val x = screenX(bullet.x, f)
        val y = screenY(f) - w * 0.06f * f
        canvas.drawRect(x - bw / 2f - 1f, y - bh - 1f, x + bw / 2f + 1f, y + 1f, bulletEdgePaint)
        canvas.drawRect(x - bw / 2f, y - bh, x + bw / 2f, y, bulletPaint)
    }

    private fun drawBoss(canvas: Canvas, b: CrowdWorld.Boss, d: Float) {
        val f = factor(d)
        if (f < 0.05f) return
        val w = width.toFloat()
        val y = screenY(f)
        val rpx = w * LANE_HALF_PX * f * 0.9f
        canvas.drawRect(screenX(-1f, f), y - rpx * 1.2f, screenX(1f, f), y, bossBandPaint)
        drawCrowd(canvas, screenX(0f, f), y - rpx * 0.25f, b.count, rpx, enemyFrames, spritePaint, grid = true)
        label(canvas, b.count.toString(), screenX(0f, f), y - rpx * 1.2f - w * 0.05f * f, max(10f, w * 0.11f * f), Color.WHITE, color(R.color.gate_post_bad))
    }

    private fun drawPlayer(canvas: Canvas, w: Float) {
        val f = factor(0f)
        val y = screenY(f)
        val rpx = w * LANE_HALF_PX * world.playerRadius
        val px = screenX(world.playerX, f)
        val paint = if (world.flash > 0f && !world.lastGateGood) hitSpritePaint else spritePaint
        drawCrowd(canvas, px, y - rpx * 0.2f, world.count, rpx, allyFrames, paint, grid = false)
        label(
            canvas, world.count.toString(), px, y - rpx * 0.2f - rpx * 0.9f - w * 0.05f, w * 0.09f,
            if (world.flash > 0f) color(R.color.gold) else Color.WHITE, color(R.color.gate_post_good),
        )
    }

    private fun drawHud(canvas: Canvas, w: Float, h: Float) {
        val top = insetTop + h * 0.03f
        label(canvas, context.getString(R.string.level_label, world.level), w * 0.18f, top + w * 0.03f, w * 0.055f, Color.WHITE, color(R.color.text_stroke))
        label(canvas, context.getString(R.string.best_label, max(bestLevel, world.bestLevel)), w * 0.82f, top + w * 0.03f, w * 0.045f, Color.WHITE, color(R.color.text_stroke))
        // active item effects, under the level label on the left
        var ex = w * 0.05f
        val ey = top + w * 0.09f
        val eh = w * 0.06f
        if (world.rapidTimer > 0f) {
            val pw = w * 0.24f
            rect.set(ex, ey, ex + pw, ey + eh)
            canvas.drawRoundRect(rect, eh * 0.3f, eh * 0.3f, barBackPaint)
            rect.set(ex, ey, ex + pw * (world.rapidTimer / CrowdWorld.RAPID_SECONDS), ey + eh)
            itemPaint.color = color(R.color.item_rapid)
            canvas.drawRoundRect(rect, eh * 0.3f, eh * 0.3f, itemPaint)
            label(canvas, "⚡ " + context.getString(R.string.item_rapid), ex + pw / 2f, ey + eh / 2f, w * 0.035f, Color.WHITE, color(R.color.text_stroke))
            ex += pw + w * 0.02f
        }
        if (world.shield) {
            val pw = w * 0.2f
            rect.set(ex, ey, ex + pw, ey + eh)
            canvas.drawRoundRect(rect, eh * 0.3f, eh * 0.3f, barBackPaint)
            label(canvas, "🛡 " + context.getString(R.string.item_shield), ex + pw / 2f, ey + eh / 2f, w * 0.035f, Color.WHITE, color(R.color.text_stroke))
        }
        // mute toggle, under the "best" label on the right
        val size = w * 0.09f
        muteRect.set(w - w * 0.05f - size, top + w * 0.09f, w - w * 0.05f, top + w * 0.09f + size)
        canvas.drawRoundRect(muteRect, size * 0.25f, size * 0.25f, muteBgPaint)
        label(canvas, if (muted) "🔇" else "🔊", muteRect.centerX(), muteRect.centerY(), size * 0.6f, Color.WHITE, 0x00000000)
        if (world.state != CrowdWorld.State.READY) {
            val barTop = top + w * 0.012f
            canvas.drawRect(w * 0.3f, barTop, w * 0.7f, barTop + h * 0.018f, barBackPaint)
            canvas.drawRect(w * 0.3f, barTop, w * 0.3f + w * 0.4f * world.progress, barTop + h * 0.018f, barPaint)
        }
    }

    private fun localizedMessage(): String {
        val m = world.message
        val parts = m.split(':')
        val n = parts.getOrNull(1)?.toIntOrNull() ?: 0
        return when (parts[0]) {
            "wiped" -> context.getString(R.string.msg_wiped)
            "squad" -> context.getString(R.string.msg_lost_to_squad, n)
            "boss_beaten" -> context.getString(R.string.msg_boss_beaten, n)
            "boss_lost" -> context.getString(R.string.msg_lost_to_boss, n)
            else -> ""
        }
    }

    private fun drawOverlay(canvas: Canvas, w: Float, h: Float) {
        val title: String
        val body: String
        val accent: String
        when (world.state) {
            CrowdWorld.State.READY -> {
                title = context.getString(R.string.app_name)
                body = context.getString(R.string.how_to_play)
                accent = context.getString(R.string.tap_to_start)
            }
            CrowdWorld.State.LEVEL_CLEAR -> {
                title = context.getString(R.string.level_clear, world.level)
                body = localizedMessage() + "\n" + context.getString(R.string.remaining_and_kills, world.count, world.kills)
                accent = context.getString(R.string.tap_next_level)
            }
            CrowdWorld.State.GAME_OVER -> {
                title = context.getString(R.string.game_over)
                body = localizedMessage() + "\n" + context.getString(R.string.reached_level, world.level)
                accent = context.getString(R.string.tap_to_retry)
            }
            CrowdWorld.State.RUNNING -> return
        }
        canvas.drawRect(0f, 0f, w, h, overlayPaint)
        label(canvas, title, w / 2f, h * 0.40f, w * 0.10f, Color.WHITE, color(R.color.gate_post_good))
        var y = h * 0.40f + w * 0.13f
        for (line in body.split('\n')) {
            canvas.drawText(line, w / 2f, y, bodyPaint)
            y += w * 0.065f
        }
        label(canvas, accent, w / 2f, y + w * 0.08f, w * 0.065f, color(R.color.gold), color(R.color.gold_stroke))
    }

    private fun color(resId: Int): Int = context.getColor(resId)

    companion object {
        private const val PREFS_NAME = "crowdrush"
        private const val KEY_BEST_LEVEL = "best_level"
        private const val KEY_MUTED = "muted"

        private const val DEPTH_K = 0.065f
        private const val HORIZON = 0.30f
        private const val BASE_Y = 0.86f
        private const val LANE_HALF_PX = 0.5f
        private const val VIEW_DISTANCE = 60f
        private const val STRIPE_SPACING = 4f
        private const val WALL_HEIGHT = 0.035f
        private const val MAX_DRAWN_UNITS = 64
        private const val GOLDEN_ANGLE = 2.39996f
    }
}
