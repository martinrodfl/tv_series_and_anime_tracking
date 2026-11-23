import { describe, expect, it } from 'vitest'
import { calculateProgress, getAvailableEpisodes } from './progress'

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
