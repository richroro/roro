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
    private val sndRoar = soundPool.load(context, R.raw.sfx_roar, 1)
    private val lastPlayedNanos = LongArray(9)
    private val itemPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val hazardPaint = Paint().apply { color = 0xD9F87171.toInt() }
    private val platePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xEB7C3AED.toInt() }
    private val plateEdgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFC4B5FD.toInt(); style = Paint.Style.STROKE }
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
    private val cloudPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = color(R.color.cloud) }
    private val grassPaint = Paint()
    private val roadPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val rutPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = color(R.color.road_rut); style = Paint.Style.STROKE }
    private val pebblePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = color(R.color.pebble) }
    private val fencePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = color(R.color.fence); style = Paint.Style.STROKE }
    private val fencePostPaint = Paint().apply { color = color(R.color.fence_post) }
    private val trunkPaint = Paint().apply { color = color(R.color.tree_trunk) }
    private val canopyPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = color(R.color.tree_canopy) }
    private val canopyLightPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = color(R.color.tree_canopy_light) }
    private val woodDarkPaint = Paint().apply { color = color(R.color.wood_dark) }
    private val woodPaint = Paint().apply { color = color(R.color.wood) }
    private val woodLightPaint = Paint().apply { color = color(R.color.wood_light) }
    private val gateEdgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private class Tree(val z: Float, val side: Float, val x: Float, val r: Float)
    private val trees = Array(40) { i -> Tree(i * 9f + ((i * 37) % 5), if (i % 2 == 0) -1f else 1f, 1.35f + ((i * 53) % 7) / 10f, 0.8f + ((i * 29) % 5) / 10f) }
    private val clouds = arrayOf(floatArrayOf(0.12f, 0.06f, 0.09f), floatArrayOf(0.38f, 0.11f, 0.07f), floatArrayOf(0.7f, 0.05f, 0.1f), floatArrayOf(0.9f, 0.13f, 0.06f))
    // Sprites drawn by tools/generate_sprites.py: rangers seen from behind, goblins facing the camera.
    private val allyFrames: Array<Bitmap> = arrayOf(
        BitmapFactory.decodeResource(resources, R.drawable.ally_back_0),
        BitmapFactory.decodeResource(resources, R.drawable.ally_back_1),
    )
    private val mobFrames: Array<Array<Bitmap>> = arrayOf(
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.mob_0_0), BitmapFactory.decodeResource(resources, R.drawable.mob_0_1)),
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.mob_1_0), BitmapFactory.decodeResource(resources, R.drawable.mob_1_1)),
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.mob_2_0), BitmapFactory.decodeResource(resources, R.drawable.mob_2_1)),
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.mob_3_0), BitmapFactory.decodeResource(resources, R.drawable.mob_3_1)),
    )
    private val bossFrames: Array<Array<Bitmap>> = arrayOf(
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.boss_0_0), BitmapFactory.decodeResource(resources, R.drawable.boss_0_1)),
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.boss_1_0), BitmapFactory.decodeResource(resources, R.drawable.boss_1_1)),
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.boss_2_0), BitmapFactory.decodeResource(resources, R.drawable.boss_2_1)),
        arrayOf(BitmapFactory.decodeResource(resources, R.drawable.boss_3_0), BitmapFactory.decodeResource(resources, R.drawable.boss_3_1)),
    )
    private var shakeTimer = 0f
    private val monsterHitPaint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG).apply {
        colorFilter = LightingColorFilter(0xFFFFFFFF.toInt(), 0x00FF4040)
    }
    private var monsterHitTimer = 0f
    private var flashTimer = 0f
    private var flashColor = 0
    private val flashPaint = Paint()
    private val hpBackPaint = Paint().apply { color = 0x8C0F172A.toInt() }
    private val hpPaint = Paint().apply { color = color(R.color.hp_fill) }
    private val hpTrackPaint = Paint().apply { color = color(R.color.hp_track) }
    private val hpEdgePaint = Paint().apply { color = Color.WHITE; style = Paint.Style.STROKE; strokeWidth = 1.5f }
    private val spritePaint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)
    private val hitSpritePaint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG).apply {
        colorFilter = LightingColorFilter(0xFFFFB366.toInt(), 0x00331100)
    }
    private val shadowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0x40000000 }
    private val gateGoodPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = color(R.color.gate_good) }
    private val gateBadPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = color(R.color.gate_bad) }
    private val gateUsedPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = color(R.color.gate_used) }
    private val overlayPaint = Paint().apply { color = color(R.color.overlay_story) }
    private val barBackPaint = Paint().apply { color = 0x590F172A }
    private val barPaint = Paint().apply { color = color(R.color.gold) }
    private val bulletPaint = Paint().apply { color = color(R.color.bullet) }
    private val bulletEdgePaint = Paint().apply { color = color(R.color.bullet_edge) }
    private val corePaint = Paint().apply { color = 0xFFFFFBEB.toInt() }
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

    private fun screenFlash(color: Int, strength: Float) {
        flashColor = color
        flashTimer = strength
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
            CrowdWorld.Event.Type.HIT_ENEMY -> {
                sparks(e.x, e.z, if (e.flag) 10 else 3, color(R.color.spark_enemy), 0.15f)
                if (e.flag) play(sndDing, 2, 80, 0.5f) else play(sndHit, 1, 50, 0.3f, 0.2f)
            }
            CrowdWorld.Event.Type.HIT_BOSS -> {
                monsterHitTimer = 0.08f
                sparks(e.x, e.z, if (e.flag) 30 else 3, color(R.color.monster_spark), 0.3f)
                if (e.flag) {
                    shakeTimer = 0.5f
                    screenFlash(Color.WHITE, 0.5f)
                    play(sndBoom, 7, 0, 0.9f)
                } else {
                    play(sndHit, 1, 50, 0.3f, 0.2f)
                }
            }
            CrowdWorld.Event.Type.HIT_WALL -> {
                sparks(e.x, e.z, if (e.flag) 22 else 3, color(R.color.wood_light), 0.25f)
                if (e.flag) {
                    screenFlash(sparkGood, 0.25f)
                    shakeTimer = 0.25f
                    play(sndBoom, 7, 0, 0.8f)
                } else {
                    play(sndHit, 1, 50, 0.3f, 0.2f)
                }
            }
            CrowdWorld.Event.Type.WALL_CONTACT -> {
                floatText("-" + e.value, e.x, e.z, sparkBad)
                sparks(e.x, e.z, 20, color(R.color.wood_light), 0.5f)
                screenFlash(color(R.color.hit), 0.35f)
                shakeTimer = 0.3f
                play(sndBuzz, 3, 150, 0.8f)
            }
            CrowdWorld.Event.Type.ROAR -> {
                floatText(context.getString(R.string.monster_appears, monsterName(e.value)), 0f, e.z, sparkBad)
                shakeTimer = 0.5f
                play(sndRoar, 8, 0, 0.9f)
            }
            CrowdWorld.Event.Type.GATE_GOOD -> {
                floatText(e.label, e.x, e.z, gold)
                sparks(e.x, e.z, 18, sparkGood, 0.5f)
                screenFlash(sparkGood, 0.22f)
                play(sndDing, 2, 80, 0.7f)
            }
            CrowdWorld.Event.Type.GATE_BAD -> {
                floatText(e.label, e.x, e.z, sparkBad)
                sparks(e.x, e.z, 10, sparkBad, 0.4f)
                screenFlash(sparkBad, 0.3f)
                play(sndBuzz, 3, 150, 0.7f)
            }
            CrowdWorld.Event.Type.CONTACT -> {
                floatText("-" + e.value + " " + stageMobs[stageIndex(world.level)], e.x, e.z, sparkBad)
                sparks(e.x, e.z, 18, color(R.color.spark_enemy), 0.5f)
                screenFlash(color(R.color.hit), 0.3f)
                shakeTimer = 0.25f
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

    // ---- stage stories (res/values/arrays.xml): each stage is an everyday-villain vignette ----
    private val stagePlaces: Array<String> = resources.getStringArray(R.array.stage_place)
    private val stageVillains: Array<String> = resources.getStringArray(R.array.stage_villain)
    private val stageTags: Array<String> = resources.getStringArray(R.array.stage_tag)
    private val stageStories: Array<String> = resources.getStringArray(R.array.stage_story)
    private val stageMobs: Array<String> = resources.getStringArray(R.array.stage_mob)
    private val stageMinis: Array<String> = resources.getStringArray(R.array.stage_mini)
    private val stageClears: Array<String> = resources.getStringArray(R.array.stage_clear)
    private val stageFails: Array<String> = resources.getStringArray(R.array.stage_fail)

    private fun stageIndex(level: Int): Int = (level - 1).mod(stageVillains.size)

    private fun seasonOf(level: Int): Int = (level - 1) / stageVillains.size + 1

    private fun monsterName(kind: Int): String = stageVillains[kind.coerceIn(0, stageVillains.size - 1)]

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

    private fun drawWall(canvas: Canvas, wall: CrowdWorld.Barricade, d: Float) {
        val f = factor(d)
        if (f < 0.05f) return
        val w = width.toFloat()
        val x0 = screenX(wall.x - wall.halfWidth, f)
        val x1 = screenX(wall.x + wall.halfWidth, f)
        val wh = w * 0.13f * f
        val y = screenY(f)
        canvas.drawRect(x0, y - wh * 0.12f, x1, y + wh * 0.12f, shadowPaint)
        val planks = 4
        val ratio = (wall.hp / max(1, wall.maxHp).toFloat()).coerceIn(0f, 1f)
        val shown = max(1, kotlin.math.ceil(planks * ratio).toInt())
        for (k in 0 until shown) {                       // the top planks fall away as it breaks
            val py = y - wh + (planks - 1 - k) * (wh / planks)
            canvas.drawRect(x0, py, x1, py + wh / planks + 1f, woodDarkPaint)
            canvas.drawRect(x0 + 2f, py + 2f, x1 - 2f, py + wh / planks - 1f, if (k % 2 == 1) woodLightPaint else woodPaint)
        }
        for (px in floatArrayOf(x0, x1)) {
            canvas.drawRect(px - w * 0.012f * f, y - wh * 1.15f, px + w * 0.012f * f, y, woodDarkPaint)
        }
        canvas.drawRect(x0, y - wh * 0.98f, x1, y - wh * 0.98f + max(2f, wh * 0.1f), hazardPaint)
        label(canvas, wall.hp.toString(), (x0 + x1) / 2f, y - wh * 0.55f, max(11f, w * 0.085f * f), Color.WHITE, color(R.color.gate_post_bad))
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
        monsterHitTimer = max(0f, monsterHitTimer - dt)
        shakeTimer = max(0f, shakeTimer - dt)
        flashTimer = max(0f, flashTimer - dt * 2.2f)
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
            val unit = unitPx(f)
            val mx = screenX(muzzleX, f)
            val my = screenY(f) - unit * 2.2f
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
        grassPaint.shader = LinearGradient(
            0f, h * HORIZON, 0f, h.toFloat(),
            color(R.color.grass_far), color(R.color.grass_near),
            Shader.TileMode.CLAMP,
        )
        roadPaint.shader = LinearGradient(
            0f, h * HORIZON, 0f, h * BASE_Y,
            color(R.color.road_far), color(R.color.road_near),
            Shader.TileMode.CLAMP,
        )
        rutPaint.strokeWidth = max(1f, w * 0.012f)
        fencePaint.strokeWidth = max(1f, w * 0.006f)
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

    /**
     * Scale factor for something [d] metres ahead of the crew. Negative distances are allowed so
     * the road, ruts and fences carry on past the crew to the bottom edge of the screen instead of
     * stopping short on the grass.
     */
    private fun factor(d: Float): Float = 1f / (1f + max(-NEAR_OVERSHOOT, d) * DEPTH_K)

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

        canvas.save()
        if (shakeTimer > 0f) {
            canvas.translate((fxRandom.nextFloat() - 0.5f) * shakeTimer * w * 0.03f, (fxRandom.nextFloat() - 0.5f) * shakeTimer * w * 0.03f)
        }
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
            if (b.alive && d > -4f && d < VIEW_DISTANCE) drawables.add(d to { drawMonster(canvas, b, d) })
        }
        for (wall in world.walls) {
            val d = wall.z - world.z
            if (wall.alive && d > -4f && d < VIEW_DISTANCE) drawables.add(d to { drawWall(canvas, wall, d) })
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
        if (flashTimer > 0f) {
            flashPaint.color = flashColor
            flashPaint.alpha = (255 * min(0.55f, flashTimer)).toInt().coerceIn(0, 255)
            canvas.drawRect(-w, -h, w * 2f, h * 2f, flashPaint)
        }
        canvas.restore()
        drawHud(canvas, w, h)
        drawOverlay(canvas, w, h)
    }

    private fun drawLane(canvas: Canvas, w: Float, h: Float) {
        val hz = h * HORIZON
        canvas.drawRect(0f, 0f, w, hz + 1f, skyPaint)
        for (c in clouds) {
            val x = ((c[0] * w + runTime * 6f) % (w * 1.2f)) - w * 0.1f
            val y = c[1] * h
            val r = c[2] * w
            rect.set(x - r, y - r * 0.45f, x + r, y + r * 0.45f)
            canvas.drawOval(rect, cloudPaint)
            rect.set(x - r * 1.2f, y + r * 0.1f - r * 0.35f, x, y + r * 0.1f + r * 0.35f)
            canvas.drawOval(rect, cloudPaint)
            rect.set(x + r * 0.05f, y + r * 0.12f - r * 0.32f, x + r * 1.15f, y + r * 0.12f + r * 0.32f)
            canvas.drawOval(rect, cloudPaint)
        }
        canvas.drawRect(0f, hz, w, h, grassPaint)

        val farF = factor(VIEW_DISTANCE)
        val nearF = factor(-NEAR_OVERSHOOT)
        val farY = screenY(farF)
        val nearY = screenY(nearF)
        path.reset()
        path.moveTo(screenX(-1f, nearF), nearY)
        path.lineTo(screenX(1f, nearF), nearY)
        path.lineTo(screenX(1f, farF), farY)
        path.lineTo(screenX(-1f, farF), farY)
        path.close()
        canvas.drawPath(path, roadPaint)
        for (rx in floatArrayOf(-0.45f, 0.45f)) {
            canvas.drawLine(screenX(rx, nearF), nearY, screenX(rx, farF), farY, rutPaint)
        }
        var z = -(world.z % 5f) - 5f
        while (z < VIEW_DISTANCE) {
            val f = factor(z)
            val k = ((z + world.z) / 5f).toInt()
            val px = screenX(((k * 71) % 17) / 17f * 1.6f - 0.8f, f)
            val py = screenY(f)
            rect.set(px - w * 0.012f * f, py - w * 0.006f * f, px + w * 0.012f * f, py + w * 0.006f * f)
            canvas.drawOval(rect, pebblePaint)
            z += 5f
        }
        // trees beyond the fence, far to near
        for (i in trees.indices.reversed()) {
            val t = trees[i]
            var d = t.z - (world.z % 360f)
            if (d < -4f) d += 360f
            if (d > VIEW_DISTANCE) continue
            val f = factor(d)
            val tx = screenX(t.side * t.x, f)
            val ty = screenY(f)
            val th = w * 0.2f * t.r * f
            canvas.drawRect(tx - th * 0.06f, ty - th * 0.45f, tx + th * 0.06f, ty, trunkPaint)
            canvas.drawCircle(tx, ty - th * 0.7f, th * 0.32f, canopyPaint)
            canvas.drawCircle(tx - th * 0.1f, ty - th * 0.78f, th * 0.22f, canopyLightPaint)
        }
        // fence rails and posts
        for (side in floatArrayOf(-1f, 1f)) {
            canvas.drawLine(screenX(side * 1.06f, nearF), nearY - w * 0.035f, screenX(side * 1.06f, farF), farY - w * 0.035f * farF, fencePaint)
            var fz = -(world.z % 6f) - 6f
            while (fz < VIEW_DISTANCE) {
                val f = factor(fz)
                val px = screenX(side * 1.06f, f)
                val ph = w * 0.05f * f
                canvas.drawRect(px - w * 0.006f * f, screenY(f) - ph, px + w * 0.006f * f, screenY(f), fencePostPaint)
                fz += 6f
            }
        }
    }

    private val crowdXs = FloatArray(MAX_DRAWN_UNITS)
    private val crowdYs = FloatArray(MAX_DRAWN_UNITS)

    /** Soldier size on screen depends only on perspective, never on crowd size. */
    private fun unitPx(f: Float): Float = max(2.5f, width * 0.022f * f)

    /** Squads bigger than [MAX_DRAWN_UNITS] shrink their drawn ranks in proportion to their losses. */
    private fun drawnCount(count: Int, maxCount: Int): Int = when {
        count <= 0 -> 0
        maxCount <= MAX_DRAWN_UNITS -> min(count, MAX_DRAWN_UNITS)
        else -> max(1, Math.round(MAX_DRAWN_UNITS * count / maxCount.toFloat()))
    }

    /**
     * Crowds stand on the ground in the world, not on a flat sheet: every figure is placed at its
     * own lane position and distance and then projected, so ranks further back really are further
     * back (smaller, higher up the screen) instead of being stacked upward at one size.
     * Slots come from the crowd's original size so losses thin the front rank rather than
     * re-packing the block. [stepRate] 0 means standing around; higher means walking.
     */
    private fun drawCrowd(
        canvas: Canvas,
        worldX: Float,
        worldZ: Float,
        drawn: Int,
        slots: Int,
        frames: Array<Bitmap>,
        paint: Paint,
        grid: Boolean,
        halfWidth: Float = CrowdWorld.ENEMY_HALF_WIDTH,
        stepRate: Float = 1f,
        alpha: Float = 1f,
    ) {
        val slotCount = min(slots, MAX_DRAWN_UNITS)
        val n = min(drawn, slotCount)
        if (n <= 0) return
        if (grid) {
            val fit = max(1, Math.round(halfWidth * 2f / CROWD_SPACING_X))
            val cols = min(fit, max(1, kotlin.math.ceil(sqrt(slotCount * 1.6f)).toInt()))
            val rows = (slotCount + cols - 1) / cols
            for (i in 0 until n) {
                val col = i % cols
                val row = i / cols
                val jitter = ((i * 7919) % 13) / 13f - 0.5f
                crowdXs[i] = (col - (cols - 1) / 2f) * CROWD_SPACING_X + jitter * CROWD_SPACING_X * 0.22f
                // index 0 is the back rank, so losses eat the front
                crowdYs[i] = (rows - 1 - row) * CROWD_SPACING_Z
            }
        } else {
            for (i in 0 until n) {
                val angle = i * GOLDEN_ANGLE
                val r = sqrt(i + 0.5f)
                crowdXs[i] = cos(angle) * r * 0.062f
                crowdYs[i] = sin(angle) * r * 0.21f
            }
        }
        val baseAlpha = paint.alpha
        if (alpha < 1f) paint.alpha = (baseAlpha * alpha.coerceIn(0f, 1f)).toInt()
        for (i in (0 until n).sortedByDescending { crowdYs[it] }) {   // far ranks first
            val f = factor(worldZ + crowdYs[i] - world.z)
            if (f < 0.04f) continue
            val unit = unitPx(f)
            val sh = unit * 3.6f
            val sw = sh * 0.8f
            val bob: Float
            val sway: Float
            val frame: Int
            if (stepRate > 0.05f) {
                frame = ((runTime * 8f * min(1f, stepRate + 0.35f)).toInt() + i) and 1
                bob = abs(sin(runTime * 12f + i)) * unit * 0.25f * min(1f, stepRate + 0.3f)
                sway = sin(runTime * 6f + i * 1.7f) * unit * 0.1f * stepRate
            } else {
                frame = 0
                bob = abs(sin(runTime * 2.2f + i * 0.7f)) * unit * 0.06f      // standing around
                sway = sin(runTime * 1.3f + i) * unit * 0.03f
            }
            val x = screenX(worldX + crowdXs[i], f) + sway
            val ground = screenY(f)
            rect.set(x - sw * 0.42f, ground - unit * 0.28f, x + sw * 0.42f, ground + unit * 0.28f)
            canvas.drawOval(rect, shadowPaint)
            rect.set(x - sw / 2f, ground - sh - bob, x + sw / 2f, ground - bob)
            canvas.drawBitmap(frames[frame], null, rect, paint)
        }
        paint.alpha = baseAlpha
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
        val gh = w * 0.15f * f
        val postW = max(2f, w * 0.03f * f)
        drawGateSide(canvas, g.left, g.used, -1f, 0f, f, y, gh, postW, w)
        drawGateSide(canvas, g.right, g.used, 0f, 1f, f, y, gh, postW, w)
        for (gx in floatArrayOf(-1f, 0f, 1f)) {
            val px = screenX(gx, f)
            canvas.drawRect(px - postW / 2f - 1f, y - gh * 1.3f, px + postW / 2f + 1f, y, woodDarkPaint)
            canvas.drawRect(px - postW / 2f, y - gh * 1.3f, px + postW / 2f, y, woodPaint)
            canvas.drawRect(px - postW / 2f, y - gh * 1.3f, px - postW / 2f + postW * 0.4f, y, woodLightPaint)
            canvas.drawRect(px - postW * 0.8f, y - gh * 1.34f, px + postW * 0.8f, y - gh * 1.26f, woodDarkPaint)
        }
    }

    private fun drawGateSide(
        canvas: Canvas, side: CrowdWorld.GateSide, used: Boolean,
        xFrom: Float, xTo: Float, f: Float, y: Float, gh: Float, postW: Float, w: Float,
    ) {
        val x0 = screenX(xFrom, f) + postW
        val x1 = screenX(xTo, f) - postW
        val y0 = y - gh * 1.15f
        val y1 = y - gh * 0.15f
        path.reset()
        path.moveTo(x0, y0 + gh * 0.12f)
        path.quadTo((x0 + x1) / 2f, y0 - gh * 0.12f, x1, y0 + gh * 0.12f)
        path.lineTo(x1, y1)
        path.lineTo(x0, y1)
        path.close()
        val panel = if (used) gateUsedPaint else if (side.isGood) gateGoodPaint else gateBadPaint
        canvas.drawPath(path, panel)
        gateEdgePaint.strokeWidth = max(1f, w * 0.005f * f)
        gateEdgePaint.color = if (used) color(R.color.gate_edge_used) else if (side.isGood) color(R.color.gate_edge_good) else color(R.color.gate_edge_bad)
        canvas.drawPath(path, gateEdgePaint)
        label(
            canvas, side.label, (x0 + x1) / 2f, (y0 + y1) / 2f + gh * 0.04f, max(8f, w * 0.075f * f),
            Color.WHITE, if (side.isGood) color(R.color.gate_stroke_good) else color(R.color.gate_stroke_bad),
        )
    }

    private fun drawEnemy(canvas: Canvas, e: CrowdWorld.Enemy, d: Float) {
        val f = factor(d)
        if (f < 0.05f) return
        val w = width.toFloat()
        val scale = if (e.elite) 1.6f else 1f
        val slots = drawnCount(e.maxCount, e.maxCount)
        val drawn = drawnCount(e.count, e.maxCount)
        // fade in over the last stretch of view distance so squads do not pop into existence
        val fade = ((VIEW_DISTANCE - d) / 12f).coerceIn(0f, 1f)
        drawCrowd(
            canvas, e.x, e.z, drawn, slots, mobFrames[stageIndex(world.level)], spritePaint,
            grid = true, halfWidth = CrowdWorld.ENEMY_HALF_WIDTH * scale,
            stepRate = e.step, alpha = fade,
        )
        val cx = screenX(e.x, f)
        val top = screenY(f) - unitPx(f) * 3.6f * scale - w * 0.03f * f
        label(canvas, e.count.toString(), cx, top, max(9f, w * 0.07f * f * scale), Color.WHITE, color(R.color.gate_post_bad))
        if (e.elite) {
            val name = stageMinis[stageIndex(world.level)]
            val fs = max(9f, w * 0.05f * f)
            bodyPaint.textSize = fs
            val tw = bodyPaint.measureText(name) + fs * 0.9f
            rect.set(cx - tw / 2f, top - fs * 2.1f, cx + tw / 2f, top - fs * 0.6f)
            canvas.drawRoundRect(rect, fs * 0.25f, fs * 0.25f, platePaint)
            plateEdgePaint.strokeWidth = max(1f, fs * 0.09f)
            canvas.drawRoundRect(rect, fs * 0.25f, fs * 0.25f, plateEdgePaint)
            label(canvas, name, cx, rect.centerY(), fs, Color.WHITE, color(R.color.gate_stroke_bad))
        }
    }

    private fun drawBullet(canvas: Canvas, bullet: CrowdWorld.Bullet, d: Float) {
        val f = factor(d)
        if (f < 0.05f) return
        val w = width.toFloat()
        val bw = max(3f, w * 0.018f * f)
        val bh = max(7f, w * 0.07f * f)
        val x = screenX(bullet.x, f)
        val y = screenY(f) - w * 0.07f * f
        bulletPaint.alpha = 90                                           // tracer trail
        canvas.drawRect(x - bw * 0.35f, y - bh * 2.1f, x + bw * 0.35f, y - bh * 0.8f, bulletPaint)
        bulletPaint.alpha = 255
        canvas.drawRect(x - bw / 2f - 1f, y - bh - 1f, x + bw / 2f + 1f, y + 1f, bulletEdgePaint)
        canvas.drawRect(x - bw / 2f, y - bh, x + bw / 2f, y, bulletPaint)
        canvas.drawRect(x - bw * 0.2f, y - bh, x + bw * 0.2f, y - bh * 0.45f, corePaint)
    }

    /**
     * A wall of henchmen behind the villain, laid out in screen space so it stacks upward and
     * widens like a packed stand. It shrinks row by row as the villain's HP drops.
     */
    private fun drawHorde(canvas: Canvas, b: CrowdWorld.Boss, baseY: Float, f: Float) {
        val ratio = (b.count / max(1, b.maxCount).toFloat()).coerceIn(0f, 1f)
        if (ratio <= 0f) return
        val w = width.toFloat()
        val frames = mobFrames[stageIndex(world.level)]
        val sh = w * 0.062f * (0.8f + 0.45f * f)
        val sw = sh * 0.8f
        val rowH = sh * 0.40f
        val rows = max(1, kotlin.math.ceil(HORDE_ROWS * ratio).toInt())
        var budget = 340
        for (row in rows - 1 downTo 0) {
            if (budget <= 0) break
            val y = baseY - row * rowH
            val halfPx = min(w * 0.78f, w * (0.26f + row * 0.055f))
            val cols = max(7, (halfPx * 2f / (sw * 0.82f)).toInt())
            spritePaint.alpha = (255 * (0.62f + 0.38f * (1f - row / (HORDE_ROWS * 1.4f)))).toInt().coerceIn(0, 255)
            for (col in 0 until cols) {
                if (budget <= 0) break
                val px = w / 2f - halfPx + (col + if (row % 2 == 1) 0.5f else 0f) * (halfPx * 2f / cols)
                if (px < -sw || px > w + sw) continue
                rect.set(px - sw / 2f, y - sh, px + sw / 2f, y)
                canvas.drawBitmap(frames[(row + col) and 1], null, rect, spritePaint)
                budget--
            }
        }
        spritePaint.alpha = 255
    }

    private fun drawMonster(canvas: Canvas, b: CrowdWorld.Boss, d: Float) {
        val f = factor(d)
        if (f < 0.05f) return
        val w = width.toFloat()
        drawHorde(canvas, b, screenY(f), f)
        val y = screenY(f)
        val frames = bossFrames[b.kind.coerceIn(0, bossFrames.size - 1)]
        val stomp = if (b.marching) abs(sin(runTime * PI_F * 3f)) else 0f
        val sprite = frames[if (b.marching) (runTime * 3f).toInt() and 1 else 0]
        val breathe = 1f + 0.02f * sin(runTime * 4f)
        val hit = monsterHitTimer > 0f
        val mh = w * 0.58f * f * breathe
        val mw = mh * 0.8f
        val x = screenX(0f, f) + if (b.marching) sin(runTime * PI_F * 3f) * w * 0.01f * f else 0f
        val ground = y
        val yTop = ground - stomp * w * 0.02f * f
        rect.set(x - mw * 0.45f, ground - mw * 0.12f, x + mw * 0.45f, ground + mw * 0.12f)
        canvas.drawOval(rect, shadowPaint)
        val lift = if (hit) w * 0.01f else 0f
        rect.set(x - mw / 2f, yTop - mh - lift, x + mw / 2f, yTop - lift)
        canvas.drawBitmap(sprite, null, rect, if (hit) monsterHitPaint else spritePaint)
        label(canvas, monsterName(b.kind), x, ground + w * 0.05f * f, max(8f, w * 0.05f * f), Color.WHITE, color(R.color.gate_post_bad))
        // a chunky HP bar with the count sitting on it
        val h = height.toFloat()
        val bw = max(w * 0.46f, w * 0.62f * f)
        val bh = max(w * 0.035f, w * 0.05f * f)
        val by = max(h * 0.1f, yTop - mh - w * 0.1f * f)
        canvas.drawRect(x - bw / 2f - 2f, by - 2f, x + bw / 2f + 2f, by + bh + 2f, hpBackPaint)
        canvas.drawRect(x - bw / 2f, by, x + bw / 2f, by + bh, hpTrackPaint)
        canvas.drawRect(x - bw / 2f, by, x - bw / 2f + bw * (b.count / max(1, b.maxCount).toFloat()), by + bh, hpPaint)
        hpEdgePaint.strokeWidth = 2f
        canvas.drawRect(x - bw / 2f - 2f, by - 2f, x + bw / 2f + 2f, by + bh + 2f, hpEdgePaint)
        label(canvas, b.count.toString(), x, by + bh / 2f, max(14f, w * 0.075f), Color.WHITE, color(R.color.gate_post_bad))
    }

    private fun drawPlayer(canvas: Canvas, w: Float) {
        val f = factor(0f)
        val unit = unitPx(f)
        val drawn = drawnCount(world.count, world.count)
        val paint = if (world.flash > 0f && !world.lastGateGood) hitSpritePaint else spritePaint
        drawCrowd(canvas, world.playerX, world.z, drawn, drawn, allyFrames, paint, grid = false, stepRate = 1f)
        val px = screenX(world.playerX, f)
        val pop = if (world.flash > 0f) 1f + world.flash * 0.7f else 1f
        label(
            canvas, world.count.toString(), px, screenY(f) - unit * 3.6f - w * 0.05f, w * 0.11f * pop,
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
            "squad" -> context.getString(R.string.msg_lost_to_squad, n) + " (" + stageMobs[stageIndex(world.level)] + ")"
            "boss_beaten" -> context.getString(R.string.msg_boss_beaten, monsterName(world.boss?.kind ?: 0))
            "boss_lost" -> context.getString(R.string.msg_lost_to_boss, monsterName(world.boss?.kind ?: 0), n)
            "wall" -> context.getString(R.string.msg_crushed_by_wall, n)
            else -> ""
        }
    }

    private fun drawOverlay(canvas: Canvas, w: Float, h: Float) {
        val stage = stageIndex(world.level)
        val season = seasonOf(world.level)
        val stageTag = if (season > 1) {
            context.getString(R.string.stage_season_label, world.level, season)
        } else {
            context.getString(R.string.stage_label, world.level)
        } + " · " + stagePlaces[stage]

        val pre: String
        val title: String
        val body: String
        val accent: String
        when (world.state) {
            CrowdWorld.State.READY -> {
                val profile = world.profileOf(world.level)
                val bits = ArrayList<String>()
                if (profile.gates >= 1.2f) bits.add(context.getString(R.string.course_gate_rush))
                if (profile.enemies >= 1.2f) bits.add(context.getString(R.string.course_waves, stageMobs[stage]))
                if (profile.walls >= 2) bits.add(context.getString(R.string.course_walls))
                if (profile.speed > 1.05f) bits.add(context.getString(R.string.course_fast))
                bits.add(context.getString(R.string.course_mini, stageMinis[stage]))
                pre = stageTag
                title = context.getString(R.string.monster_appears, stageVillains[stage])
                body = stageStories[stage] + "\n\n" + context.getString(R.string.course_label) + " · " + bits.joinToString(" · ")
                accent = context.getString(R.string.tap_to_start)
            }
            CrowdWorld.State.LEVEL_CLEAR -> {
                val next = stageIndex(world.level + 1)
                pre = context.getString(R.string.stage_cleared, world.level)
                title = context.getString(R.string.clear_title, stageVillains[stage])
                body = stageClears[stage] + "\n\n" +
                    context.getString(R.string.crew_left, world.count, world.kills) + "\n" +
                    context.getString(R.string.next_up, stageVillains[next], stageTags[next])
                accent = context.getString(R.string.tap_next_level)
            }
            CrowdWorld.State.GAME_OVER -> {
                pre = stageTag
                title = context.getString(R.string.game_over)
                body = localizedMessage() + "\n" + stageFails[stage]
                accent = context.getString(R.string.tap_to_retry)
            }
            CrowdWorld.State.RUNNING -> return
        }

        canvas.drawRect(0f, 0f, w, h, overlayPaint)
        var y = h * 0.3f
        label(canvas, pre, w / 2f, y, w * 0.042f, color(R.color.spark_good), color(R.color.text_stroke))
        y += w * 0.09f
        label(canvas, title, w / 2f, y, w * 0.1f, Color.WHITE, color(R.color.gate_post_good))
        y += w * 0.1f
        bodyPaint.textSize = w * 0.044f
        for (line in body.split('\n')) {
            canvas.drawText(line, w / 2f, y, bodyPaint)
            y += w * 0.062f
        }
        label(canvas, accent, w / 2f, y + w * 0.06f, w * 0.06f, color(R.color.gold), color(R.color.gold_stroke))
    }

    private fun color(resId: Int): Int = context.getColor(resId)

    companion object {
        private const val PREFS_NAME = "goblinhunters"
        private const val KEY_BEST_LEVEL = "best_level"
        private const val KEY_MUTED = "muted"

        private const val DEPTH_K = 0.065f
        private const val HORIZON = 0.30f
        private const val BASE_Y = 0.86f
        private const val LANE_HALF_PX = 0.5f
        private const val VIEW_DISTANCE = 60f
        private const val NEAR_OVERSHOOT = 3.4f
        private const val HORDE_ROWS = 14f
        private const val CROWD_SPACING_X = 0.135f   // lane units, about one figure wide at any distance
        private const val CROWD_SPACING_Z = 0.5f     // metres between ranks
        private const val STRIPE_SPACING = 4f
        private const val WALL_HEIGHT = 0.035f
        private const val MAX_DRAWN_UNITS = 64
        private const val GOLDEN_ANGLE = 2.39996f
        private const val PI_F = 3.1415927f
    }
}
