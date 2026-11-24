import { describe, expect, it } from 'vitest'
import { calculateProgress, describeProgress, getAvailableEpisodes, shouldSuggestCompleted } from './progress'

describe('describeProgress', () => {
  it('muestra vistos / disponibles y el porcentaje', () => {
    expect(describeProgress(3, 12)).toBe('3 / 12 (25 %)')
    expect(describeProgress(0, 0)).toBe('0 / 0 (0 %)')
  })

  it('indica que no está disponible si no se conoce el total', () => {
    expect(describeProgress(4, null)).toBe('Progreso no disponible')
  })

  it('nunca muestra más vistos que episodios emitidos', () => {
    expect(describeProgress(15, 12)).toBe('12 / 12 (100 %)')
  })
})

describe('shouldSuggestCompleted', () => {
  const finished = { userStatus: 'watching' as const, episodes: 3, nextEpisode: null, airingStatus: 'FINISHED' }

  it('sugiere cuando están vistos todos los episodios de un anime terminado', () => {
    expect(shouldSuggestCompleted(finished, [1, 2, 3])).toBe(true)
  })

  it('no sugiere si falta algún episodio, aunque haya el mismo número de vistos', () => {
    expect(shouldSuggestCompleted(finished, [1, 2])).toBe(false)
    expect(shouldSuggestCompleted(finished, [1, 2, 4])).toBe(false)
  })

  it('no sugiere si ya está completado, está en emisión o no se conoce el total', () => {
    expect(shouldSuggestCompleted({ ...finished, userStatus: 'completed' }, [1, 2, 3])).toBe(false)
    expect(shouldSuggestCompleted({ ...finished, airingStatus: 'RELEASING', nextEpisode: 4 }, [1, 2, 3])).toBe(false)
    expect(shouldSuggestCompleted({ ...finished, airingStatus: 'RELEASING' }, [1, 2, 3])).toBe(false)
    expect(shouldSuggestCompleted({ ...finished, episodes: null }, [1, 2, 3])).toBe(false)
  })
})

describe('getAvailableEpisodes', () => {
  it('usa el total cuando el anime no tiene próximo episodio', () => {
    expect(getAvailableEpisodes({ episodes: 12, nextEpisode: null })).toBe(12)
  })

  it('en emisión, cuenta hasta el episodio anterior al próximo, aunque se conozca el total', () => {
    expect(getAvailableEpisodes({ episodes: 24, nextEpisode: 6 })).toBe(5)
    expect(getAvailableEpisodes({ episodes: null, nextEpisode: 6 })).toBe(5)
  })

  it('devuelve 0 cuando aún no se emitió el primer episodio', () => {
    expect(getAvailableEpisodes({ episodes: 12, nextEpisode: 1 })).toBe(0)
  })

  it('devuelve null cuando no se conoce nada', () => {
    expect(getAvailableEpisodes({ episodes: null, nextEpisode: null })).toBeNull()
  })
})

describe('calculateProgress', () => {
  it('calcula vistos / disponibles', () => {
    expect(calculateProgress(3, 12)).toBe(25)
    expect(calculateProgress(0, 12)).toBe(0)
    expect(calculateProgress(12, 12)).toBe(100)
  })

  it('devuelve null (no 0 %) si no se conocen los disponibles', () => {
    expect(calculateProgress(0, null)).toBeNull()
    expect(calculateProgress(5, null)).toBeNull()
  })

  it('no divide por cero cuando hay 0 episodios disponibles', () => {
    expect(calculateProgress(0, 0)).toBe(0)
    expect(calculateProgress(2, 0)).toBe(0)
  })

  it('limita el resultado al rango 0–100', () => {
    expect(calculateProgress(15, 12)).toBe(100)
    expect(calculateProgress(-1, 12)).toBe(0)
  })
})
