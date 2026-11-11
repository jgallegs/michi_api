import React, { useState } from 'react';
import { IconArrowLeft, IconArrowRight, IconCheck, IconList, IconPlayerPlay, IconX } from '@tabler/icons';
import { COURSE, LESSONS } from '../lessons';
import { finishLesson, openLesson, useCourse } from '../progress';

const stop = (event) => event.stopPropagation();

// The guided course, next to the canvas it teaches: one lesson at a time, each with a button to try
// what it explains on the flow that is open. "onPractice" drops the block or the step of the lesson.
const CoursePanel = ({ onPractice, onClose }) => {
  const { done, current } = useCourse();
  const [showsIndex, setShowsIndex] = useState(false);
  const at = Math.max(0, LESSONS.findIndex((lesson) => lesson.id === current));
  const lesson = LESSONS[at];
  const chapter = COURSE.find((item) => item.lessons.includes(lesson));
  const isLast = at === LESSONS.length - 1;

  return (
    <div className="flow-course flow-overlay" onMouseDown={stop} onDoubleClick={stop} onWheel={stop} data-testid="flow-course">
      <div className="flow-course-header">
        <span className="flow-course-title">Guided course</span>
        <span className="flow-course-progress fork-no-translate" data-testid="flow-course-progress">{done.length} / {LESSONS.length}</span>
        <button type="button" className="flow-icon-button" aria-label="All the lessons" title="All the lessons" onClick={() => setShowsIndex(!showsIndex)} data-testid="flow-course-index">
          <IconList size={14} strokeWidth={1.75} />
        </button>
        <button type="button" className="flow-icon-button" aria-label="Close" title="Close" onClick={onClose} data-testid="flow-course-close">
          <IconX size={14} strokeWidth={2} />
        </button>
      </div>
      <div className="flow-course-bar"><span style={{ width: `${Math.round((done.length / LESSONS.length) * 100)}%` }} /></div>
      {showsIndex ? (
        <div className="flow-course-body">
          {COURSE.map((item) => (
            <div key={item.title}>
              <div className="flow-course-chapter">{item.title}</div>
              {item.lessons.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={`flow-course-entry ${entry.id === lesson.id ? 'current' : ''} ${done.includes(entry.id) ? 'done' : ''}`}
                  onClick={() => {
                    openLesson(entry.id);
                    setShowsIndex(false);
                  }}
                  data-testid={`flow-course-entry-${entry.id}`}
                >
                  <span className="flow-course-tick">{done.includes(entry.id) ? <IconCheck size={12} strokeWidth={2.5} /> : null}</span>
                  <span>{entry.title}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="flow-course-body" data-testid="flow-course-lesson">
            <div className="flow-course-chapter">{chapter.title}</div>
            <div className="flow-course-lesson-title">{lesson.title}</div>
            {lesson.text.map((line) => <p key={line} className="flow-course-line">{line}</p>)}
            {lesson.practice ? (
              <button type="button" className="flow-tool run flow-course-practice" onClick={() => onPractice(lesson.practice)} data-testid="flow-course-practice">
                <IconPlayerPlay size={14} strokeWidth={1.75} />
                <span>Try it on the canvas</span>
              </button>
            ) : null}
          </div>
          <div className="flow-course-footer">
            <button type="button" className="flow-tool" disabled={at === 0} onClick={() => openLesson(LESSONS[at - 1].id)} data-testid="flow-course-previous">
              <IconArrowLeft size={14} strokeWidth={1.75} />
              <span>Previous</span>
            </button>
            <span className="flow-course-count fork-no-translate">{at + 1} / {LESSONS.length}</span>
            <button type="button" className="flow-tool" onClick={() => finishLesson(lesson.id)} data-testid="flow-course-next">
              <span>{isLast ? 'Finish' : 'Next'}</span>
              {isLast ? <IconCheck size={14} strokeWidth={1.75} /> : <IconArrowRight size={14} strokeWidth={1.75} />}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default CoursePanel;
