package com.richroro.skydodge

import kotlin.math.max
import kotlin.math.min
import kotlin.random.Random

/**
 * Pure game simulation with no Android dependencies, so it can be unit tested on the JVM.
 *
 * Coordinates are "world units": the playfield is always 1.0 wide and [height] tall,
 * where [height] is the screen aspect ratio (height / width). The renderer multiplies by
 * the view width in pixels.
 */
class GameWorld(private val random: Random = Random.Default) {

    enum class State { READY, PLAYING, PAUSED, GAME_OVER }

    enum class Kind { BLOCK, STAR }

    class Entity(
        val kind: Kind,
        var x: Float,
        var y: Float,
        val width: Float,
        val height: Float,
        val fallSpeed: Float,
        val spin: Float,
    )

    var height: Float = 2f
        private set

    var state: State = State.READY
        private set

    var score: Int = 0
        private set

    var elapsed: Float = 0f
        private set

    var starsCollected: Int = 0
        private set

    var playerX: Float = 0.5f
        private set

    val playerY: Float
        get() = height - PLAYER_BOTTOM_MARGIN

    private val mutableEntities = ArrayList<Entity>()
    val entities: List<Entity>
        get() = mutableEntities

    private var spawnTimer = 0f

    /** Current fall speed in world units per second; ramps up over time. */
    val fallSpeed: Float
        get() = min(BASE_FALL_SPEED + elapsed * FALL_ACCELERATION, MAX_FALL_SPEED)

    /** Seconds between spawns; shrinks over time. */
    val spawnInterval: Float
        get() = max(MIN_SPAWN_INTERVAL, BASE_SPAWN_INTERVAL - elapsed * SPAWN_ACCELERATION)

    fun setAspect(aspect: Float) {
        height = aspect.coerceIn(1f, 3f)
    }

    fun start() {
        mutableEntities.clear()
        elapsed = 0f
        score = 0
        starsCollected = 0
        playerX = 0.5f
        spawnTimer = FIRST_SPAWN_DELAY
        state = State.PLAYING
    }

    fun pause() {
        if (state == State.PLAYING) state = State.PAUSED
    }

    fun resume() {
        if (state == State.PAUSED) state = State.PLAYING
    }

    fun movePlayerBy(dx: Float) {
        playerX = (playerX + dx).coerceIn(PLAYER_RADIUS, 1f - PLAYER_RADIUS)
    }

    fun update(dtSeconds: Float) {
        if (state != State.PLAYING) return
        // Clamp so a long pause (or a slow first frame) can't teleport blocks through the player.
        val dt = dtSeconds.coerceIn(0f, MAX_FRAME_DT)
        elapsed += dt

        spawnTimer -= dt
        while (spawnTimer <= 0f) {
            spawn()
            spawnTimer += spawnInterval
        }

        val iterator = mutableEntities.iterator()
        while (iterator.hasNext()) {
            val entity = iterator.next()
            entity.y += entity.fallSpeed * dt
            if (entity.y - entity.height / 2f > height) {
                iterator.remove()
                continue
            }
            if (collides(entity)) {
                if (entity.kind == Kind.STAR) {
                    starsCollected++
                    iterator.remove()
                } else {
                    state = State.GAME_OVER
                    break
                }
            }
        }

        // Small epsilon absorbs float drift from summing many tiny frame deltas (e.g. 40 x 0.05 = 1.9999).
        score = (elapsed * POINTS_PER_SECOND + SCORE_EPSILON).toInt() + starsCollected * STAR_POINTS
    }

    private fun spawn() {
        val isStar = random.nextFloat() < STAR_CHANCE
        val width: Float
        val height: Float
        if (isStar) {
            width = STAR_SIZE
            height = STAR_SIZE
        } else {
            width = MIN_BLOCK_WIDTH + random.nextFloat() * (MAX_BLOCK_WIDTH - MIN_BLOCK_WIDTH)
            height = BLOCK_HEIGHT
        }
        val x = width / 2f + random.nextFloat() * (1f - width)
        val speed = fallSpeed * (0.85f + random.nextFloat() * 0.3f)
        val spin = (random.nextFloat() - 0.5f) * 120f
        mutableEntities.add(
            Entity(
                kind = if (isStar) Kind.STAR else Kind.BLOCK,
                x = x,
                y = -height,
                width = width,
                height = height,
                fallSpeed = speed,
                spin = spin,
            ),
        )
    }

    /** Circle (player) vs. axis-aligned rectangle (entity) test. */
    private fun collides(entity: Entity): Boolean {
        val halfW = entity.width / 2f
        val halfH = entity.height / 2f
        val closestX = playerX.coerceIn(entity.x - halfW, entity.x + halfW)
        val closestY = playerY.coerceIn(entity.y - halfH, entity.y + halfH)
        val dx = playerX - closestX
        val dy = playerY - closestY
        // Blocks use a slightly smaller radius so near misses feel fair; stars a larger one.
        val radius = if (entity.kind == Kind.STAR) PLAYER_RADIUS + STAR_GRAB_BONUS else PLAYER_RADIUS * BLOCK_HITBOX_SCALE
        return dx * dx + dy * dy < radius * radius
    }

    /** Test hook: inject an entity at a known position. */
    internal fun addEntityForTest(entity: Entity) {
        mutableEntities.add(entity)
    }

    companion object {
        const val PLAYER_RADIUS = 0.05f
        const val PLAYER_BOTTOM_MARGIN = 0.22f
        const val BLOCK_HITBOX_SCALE = 0.8f
        const val STAR_GRAB_BONUS = 0.015f

        const val STAR_SIZE = 0.07f
        const val STAR_CHANCE = 0.22f
        const val STAR_POINTS = 50
        const val POINTS_PER_SECOND = 10f

        const val MIN_BLOCK_WIDTH = 0.12f
        const val MAX_BLOCK_WIDTH = 0.28f
        const val BLOCK_HEIGHT = 0.065f

        const val BASE_FALL_SPEED = 0.55f
        const val MAX_FALL_SPEED = 1.6f
        const val FALL_ACCELERATION = 0.012f

        const val FIRST_SPAWN_DELAY = 0.6f
        const val BASE_SPAWN_INTERVAL = 0.9f
        const val MIN_SPAWN_INTERVAL = 0.3f
        const val SPAWN_ACCELERATION = 0.008f

        const val MAX_FRAME_DT = 0.05f
        const val SCORE_EPSILON = 0.001f
    }
}
