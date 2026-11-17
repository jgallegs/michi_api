import { PHRASES } from 'components/fork/SpanishUi/phrases';
import { READY_BLOCKS } from '../blocks/catalog';
import { ADDABLE_PIECES } from '../canvas/pieces';
import { COURSE, LESSONS } from './lessons';
import { finishLesson, openLesson, resetCourse, useCourse } from './progress';
import { renderHook, act } from '@testing-library/react';

describe('guided course', () => {
  it('has lessons that can be told apart and something to read in each', () => {
    expect(new Set(LESSONS.map((lesson) => lesson.id)).size).toBe(LESSONS.length);
    expect(LESSONS.length).toBeGreaterThanOrEqual(30);
    LESSONS.forEach((lesson) => {
      expect(lesson.title).toBeTruthy();
      expect(lesson.text.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('only lets try what the canvas can add', () => {
    LESSONS.filter((lesson) => lesson.practice).forEach((lesson) => {
      if (lesson.practice.block) {
        expect(READY_BLOCKS.map((block) => block.id)).toContain(lesson.practice.block);
      } else {
        expect(ADDABLE_PIECES).toContain(lesson.practice.step);
      }
    });
  });

  it('has a lesson to try every ready-made block', () => {
    const practised = LESSONS.map((lesson) => lesson.practice?.block).filter(Boolean);
    expect(READY_BLOCKS.map((block) => block.id).filter((id) => !practised.includes(id))).toEqual([]);
  });

  it('is written in Spanish too, title by title and paragraph by paragraph', () => {
    const texts = [...COURSE.map((chapter) => chapter.title), ...LESSONS.flatMap((lesson) => [lesson.title, ...lesson.text])];
    expect(texts.filter((text) => !PHRASES[text] || PHRASES[text] === text)).toEqual([]);
  });

  describe('progress', () => {
    beforeEach(() => resetCourse());

    it('starts at the first lesson, moves on marking what is done and remembers it', () => {
      const { result } = renderHook(() => useCourse());
      expect(result.current).toEqual({ done: [], current: LESSONS[0].id });

      act(() => finishLesson(LESSONS[0].id));
      expect(result.current).toEqual({ done: [LESSONS[0].id], current: LESSONS[1].id });
      act(() => openLesson(LESSONS[5].id));
      act(() => finishLesson(LESSONS[5].id));
      act(() => finishLesson(LESSONS[5].id));
      expect(result.current.done).toEqual([LESSONS[0].id, LESSONS[5].id]);
      expect(JSON.parse(window.localStorage.getItem('michi.flows.course'))).toEqual({ done: [LESSONS[0].id, LESSONS[5].id], current: LESSONS[6].id });
    });

    it('stays on the last lesson when it is finished, and forgets lessons that no longer exist', () => {
      const last = LESSONS[LESSONS.length - 1].id;
      window.localStorage.setItem('michi.flows.course', JSON.stringify({ done: ['gone', last], current: 'gone' }));
      const { result } = renderHook(() => useCourse());
      expect(result.current).toEqual({ done: [last], current: LESSONS[0].id });
      act(() => openLesson(last));
      act(() => finishLesson(last));
      expect(result.current.current).toBe(last);
    });
  });
});
