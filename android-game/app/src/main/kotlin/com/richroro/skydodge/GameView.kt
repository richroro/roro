package com.richroro.skydodge

import android.content.Context
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.os.Build
import android.util.AttributeSet
import android.view.Choreographer
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.View
import android.view.WindowInsets
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * Renders [GameWorld] on a plain Canvas and drives it from the display's frame clock.
 */
class GameView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : View(context, attrs) {

    private val world = GameWorld()
    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private var bestScore = prefs.getInt(KEY_BEST, 0)
    private var isNewBest = false

    private var running = false
    private var lastFrameNanos = 0L
    private var insetTop = 0f
    private var insetBottom = 0f
    private var lastTouchX = 0f

    private val backgroundPaint = Paint()
    private val playerPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = color(R.color.player) }
    private val playerGlowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = color(R.color.player_glow) }
    private val playerHighlightPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFCFFAFE.toInt() }
    private val blockPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = color(R.color.block) }
    private val blockEdgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = color(R.color.block_edge)
        style = Paint.Style.STROKE
    }
    private val starPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = color(R.color.star) }
    private val overlayPaint = Paint().apply { color = color(R.color.overlay) }
    private val hudPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = color(R.color.hud_text)
        typeface = Typeface.DEFAULT_BOLD
    }
    private val titlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = color(R.color.hud_text)
        typeface = Typeface.DEFAULT_BOLD
        textAlign = Paint.Align.CENTER
    }
    private val bodyPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = color(R.color.hud_text)
        textAlign = Paint.Align.CENTER
    }
    private val accentPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = color(R.color.star)
        typeface = Typeface.DEFAULT_BOLD
        textAlign = Paint.Align.CENTER
    }

    private val starPath = Path()
    private val rect = RectF()

    private val frameCallback = object : Choreographer.FrameCallback {
        override fun doFrame(frameTimeNanos: Long) {
            if (!running) return
            val dt = if (lastFrameNanos == 0L) 0f else (frameTimeNanos - lastFrameNanos) / 1_000_000_000f
            lastFrameNanos = frameTimeNanos

            val stateBefore = world.state
            world.update(dt)
            if (stateBefore == GameWorld.State.PLAYING && world.state == GameWorld.State.GAME_OVER) {
                onGameOver()
            }

            invalidate()
            Choreographer.getInstance().postFrameCallback(this)
        }
    }

    init {
        isFocusable = true
        isClickable = true
    }

    /** Starts (or restarts) the frame loop. Safe to call repeatedly. */
    fun resume() {
        if (running) return
        running = true
        lastFrameNanos = 0L
        Choreographer.getInstance().postFrameCallback(frameCallback)
    }

    /** Stops the frame loop and freezes the game until the player taps again. */
    fun pause() {
        running = false
        Choreographer.getInstance().removeFrameCallback(frameCallback)
        world.pause()
        invalidate()
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        resume()
    }

    override fun onDetachedFromWindow() {
        pause()
        super.onDetachedFromWindow()
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        if (w == 0 || h == 0) return
        world.setAspect(h.toFloat() / w.toFloat())
        backgroundPaint.shader = LinearGradient(
            0f, 0f, 0f, h.toFloat(),
            color(R.color.sky_top), color(R.color.sky_bottom),
            Shader.TileMode.CLAMP,
        )
        val unit = w.toFloat()
        hudPaint.textSize = unit * 0.055f
        titlePaint.textSize = unit * 0.11f
        bodyPaint.textSize = unit * 0.045f
        accentPaint.textSize = unit * 0.06f
        blockEdgePaint.strokeWidth = unit * 0.006f
    }

    override fun onApplyWindowInsets(insets: WindowInsets): WindowInsets {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val bars = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout())
            insetTop = bars.top.toFloat()
            insetBottom = bars.bottom.toFloat()
        } else {
            @Suppress("DEPRECATION")
            insetTop = insets.systemWindowInsetTop.toFloat()
            @Suppress("DEPRECATION")
            insetBottom = insets.systemWindowInsetBottom.toFloat()
        }
        return super.onApplyWindowInsets(insets)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                lastTouchX = event.x
                when (world.state) {
                    GameWorld.State.READY, GameWorld.State.GAME_OVER -> {
                        isNewBest = false
                        world.start()
                    }
                    GameWorld.State.PAUSED -> world.resume()
                    GameWorld.State.PLAYING -> Unit
                }
                if (!running) resume()
                performClick()
            }
            MotionEvent.ACTION_MOVE -> {
                if (world.state == GameWorld.State.PLAYING && width > 0) {
                    world.movePlayerBy((event.x - lastTouchX) / width * DRAG_GAIN)
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

    private fun onGameOver() {
        if (world.score > bestScore) {
            bestScore = world.score
            isNewBest = true
            prefs.edit().putInt(KEY_BEST, bestScore).apply()
        }
        performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val w = width.toFloat()
        val h = height.toFloat()
        if (w == 0f || h == 0f) return
        val unit = w // one world unit == view width in pixels

        canvas.drawRect(0f, 0f, w, h, backgroundPaint)
        drawEntities(canvas, unit)
        drawPlayer(canvas, unit)
        drawHud(canvas, unit)

        when (world.state) {
            GameWorld.State.READY -> drawOverlay(
                canvas, unit,
                title = context.getString(R.string.app_name),
                body = context.getString(R.string.how_to_play),
                accent = context.getString(R.string.tap_to_start),
            )
            GameWorld.State.PAUSED -> drawOverlay(
                canvas, unit,
                title = context.getString(R.string.score_label, world.score),
                body = null,
                accent = context.getString(R.string.paused),
            )
            GameWorld.State.GAME_OVER -> drawOverlay(
                canvas, unit,
                title = context.getString(R.string.game_over),
                body = context.getString(R.string.score_label, world.score) + "   " +
                    context.getString(R.string.best_label, bestScore),
                accent = if (isNewBest) context.getString(R.string.new_best) else context.getString(R.string.tap_to_retry),
            )
            GameWorld.State.PLAYING -> Unit
        }
    }

    private fun drawEntities(canvas: Canvas, unit: Float) {
        for (entity in world.entities) {
            val cx = entity.x * unit
            val cy = entity.y * unit
            when (entity.kind) {
                GameWorld.Kind.BLOCK -> {
                    val hw = entity.width * unit / 2f
                    val hh = entity.height * unit / 2f
                    rect.set(cx - hw, cy - hh, cx + hw, cy + hh)
                    val radius = hh * 0.5f
                    canvas.drawRoundRect(rect, radius, radius, blockPaint)
                    canvas.drawRoundRect(rect, radius, radius, blockEdgePaint)
                }
                GameWorld.Kind.STAR -> {
                    val outer = entity.width * unit / 2f
                    val angle = (world.elapsed * entity.spin) % 360f
                    canvas.save()
                    canvas.rotate(angle, cx, cy)
                    buildStar(cx, cy, outer, outer * 0.45f)
                    canvas.drawPath(starPath, starPaint)
                    canvas.restore()
                }
            }
        }
    }

    private fun drawPlayer(canvas: Canvas, unit: Float) {
        val cx = world.playerX * unit
        val cy = world.playerY * unit
        val r = GameWorld.PLAYER_RADIUS * unit
        canvas.drawCircle(cx, cy, r * 1.6f, playerGlowPaint)
        canvas.drawCircle(cx, cy, r, playerPaint)
        canvas.drawCircle(cx - r * 0.35f, cy - r * 0.35f, r * 0.28f, playerHighlightPaint)
    }

    private fun drawHud(canvas: Canvas, unit: Float) {
        val margin = unit * 0.05f
        val baseline = insetTop + margin + hudPaint.textSize
        hudPaint.textAlign = Paint.Align.LEFT
        canvas.drawText(context.getString(R.string.score_label, world.score), margin, baseline, hudPaint)
        hudPaint.textAlign = Paint.Align.RIGHT
        canvas.drawText(context.getString(R.string.best_label, bestScore), unit - margin, baseline, hudPaint)
    }

    private fun drawOverlay(canvas: Canvas, unit: Float, title: String, body: String?, accent: String) {
        val w = width.toFloat()
        val h = height.toFloat()
        canvas.drawRect(0f, 0f, w, h, overlayPaint)

        val centerX = w / 2f
        var y = h * 0.42f
        canvas.drawText(title, centerX, y, titlePaint)

        if (body != null) {
            y += unit * 0.11f
            drawWrappedText(canvas, body, centerX, y, unit * 0.86f, bodyPaint)
            y += unit * 0.07f * countLines(body, unit * 0.86f, bodyPaint)
        }

        y += unit * 0.12f
        canvas.drawText(accent, centerX, y, accentPaint)
    }

    private fun countLines(text: String, maxWidth: Float, paint: Paint): Int {
        var lines = 1
        var current = StringBuilder()
        for (word in text.split(' ')) {
            val candidate = if (current.isEmpty()) word else "$current $word"
            if (paint.measureText(candidate) > maxWidth && current.isNotEmpty()) {
                lines++
                current = StringBuilder(word)
            } else {
                current = StringBuilder(candidate)
            }
        }
        return lines
    }

    private fun drawWrappedText(canvas: Canvas, text: String, cx: Float, top: Float, maxWidth: Float, paint: Paint) {
        var y = top
        var current = StringBuilder()
        val lineHeight = paint.textSize * 1.4f
        for (word in text.split(' ')) {
            val candidate = if (current.isEmpty()) word else "$current $word"
            if (paint.measureText(candidate) > maxWidth && current.isNotEmpty()) {
                canvas.drawText(current.toString(), cx, y, paint)
                y += lineHeight
                current = StringBuilder(word)
            } else {
                current = StringBuilder(candidate)
            }
        }
        if (current.isNotEmpty()) canvas.drawText(current.toString(), cx, y, paint)
    }

    private fun buildStar(cx: Float, cy: Float, outer: Float, inner: Float) {
        starPath.reset()
        val step = PI / 5.0
        var angle = -PI / 2.0
        for (i in 0 until 10) {
            val r = if (i % 2 == 0) outer else inner
            val px = cx + (cos(angle) * r).toFloat()
            val py = cy + (sin(angle) * r).toFloat()
            if (i == 0) starPath.moveTo(px, py) else starPath.lineTo(px, py)
            angle += step
        }
        starPath.close()
    }

    private fun color(resId: Int): Int = context.getColor(resId)

    companion object {
        private const val PREFS_NAME = "skydodge"
        private const val KEY_BEST = "best_score"

        /** Finger travel is amplified a little so the ball can cross the screen with a short swipe. */
        private const val DRAG_GAIN = 1.25f
    }
}
