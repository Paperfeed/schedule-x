import {
  describe,
  it,
  expect,
  beforeEach,
  spyOn,
} from '@schedule-x/shared/src/utils/stateless/testing/unit/unit-testing-library.impl'
import { CalendarAppSingleton } from '@schedule-x/shared/src'
import { CalendarEventInternal } from '@schedule-x/shared/src/interfaces/calendar/calendar-event.interface'
import { stubInterface } from 'ts-sinon'
import CalendarConfigInternal from '@schedule-x/shared/src/interfaces/calendar/calendar-config'
import CalendarEventBuilder from '@schedule-x/shared/src/utils/stateless/calendar/calendar-event/calendar-event.builder'
import { TimeGridEventResizer } from '../time-grid-event-resizer'
import CalendarEvents from '@schedule-x/shared/src/interfaces/calendar/calendar-events.interface'
import { signal } from '@preact/signals'
import { vi } from 'vitest'

describe('Resizing events in the time grid', () => {
  describe('When the calendar has regular day boundaries 0-24', () => {
    let $app: CalendarAppSingleton
    let calendarEvent: CalendarEventInternal
    let calendarEventNearEndOfDay: CalendarEventInternal
    let calendarWrapper: HTMLDivElement
    const initialY = 500

    beforeEach(() => {
      calendarWrapper = document.createElement('div')
      $app = stubInterface<CalendarAppSingleton>()
      $app.elements = { calendarWrapper }
      $app.config = {
        ...stubInterface<CalendarConfigInternal>(),
        weekOptions: { gridHeight: 2400 },
        timePointsPerDay: 2400,
      }
      calendarEvent = new CalendarEventBuilder(
        $app.config,
        1,
        '2024-01-05 06:00',
        '2024-01-05 07:00'
      ).build()
      calendarEventNearEndOfDay = new CalendarEventBuilder(
        $app.config,
        1,
        '2024-01-05 23:00',
        '2024-01-05 23:30'
      ).build()
      $app.calendarEvents = stubInterface<CalendarEvents>()
      $app.calendarEvents.list = signal([calendarEvent])
      $app.config.callbacks = {
        onEventUpdate: vi.fn(),
      }
    })

    it('should extend an event by 30 minutes', () => {
      new TimeGridEventResizer($app, calendarEvent, initialY, 25, {
        start: '2024-01-05 00:00',
        end: '2024-01-05 23:59',
      })
      const updateEventSpy = spyOn($app.config.callbacks, 'onEventUpdate')

      // Drag 50 pixels down (half hour, because day = 2400px)
      calendarWrapper.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 0, clientY: initialY + 50 })
      )

      expect(calendarEvent.start).toBe('2024-01-05 06:00')
      expect(calendarEvent.end).toBe('2024-01-05 07:30')
      expect(updateEventSpy).toHaveBeenCalledWith({
        id: 1,
        start: '2024-01-05 06:00',
        end: '2024-01-05 07:30',
      })
    })

    it('should shorten an event by 30 minutes', () => {
      new TimeGridEventResizer($app, calendarEvent, initialY, 25, {
        start: '2024-01-05 00:00',
        end: '2024-01-05 23:59',
      })
      const updateEventSpy = spyOn($app.config.callbacks, 'onEventUpdate')

      // Drag 50 pixels up (half hour, because day = 2400px)
      calendarWrapper.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 0, clientY: initialY - 50 })
      )

      expect(calendarEvent.start).toBe('2024-01-05 06:00')
      expect(calendarEvent.end).toBe('2024-01-05 06:30')
      expect(updateEventSpy).toHaveBeenCalledWith({
        id: 1,
        start: '2024-01-05 06:00',
        end: '2024-01-05 06:30',
      })
    })

    it('should not resize above the event start', () => {
      new TimeGridEventResizer($app, calendarEvent, initialY, 25, {
        start: '2024-01-05 00:00',
        end: '2024-01-05 23:59',
      })
      const updateEventSpy = spyOn($app.config.callbacks, 'onEventUpdate')

      let currentY = initialY
      // drag 6 times 25px upwards to simulate 1 1/2 hours
      for (let i = 0; i < 6; i++) {
        currentY -= 25
        calendarWrapper.dispatchEvent(
          new MouseEvent('mousemove', { clientX: 0, clientY: currentY })
        )
      }

      expect(calendarEvent.start).toBe('2024-01-05 06:00')
      expect(calendarEvent.end).toBe('2024-01-05 06:15')
      expect(updateEventSpy).toHaveBeenCalledWith({
        id: 1,
        start: '2024-01-05 06:00',
        end: '2024-01-05 06:15',
      })
    })

    it('should not resize beyond the end of the day', () => {
      new TimeGridEventResizer($app, calendarEventNearEndOfDay, initialY, 25, {
        start: '2024-01-05 00:00',
        end: '2024-01-05 23:59',
      })
      const updateEventSpy = spyOn($app.config.callbacks, 'onEventUpdate')

      let currentY = initialY
      // drag 6 times 25px downwards to simulate 1 1/2 hours
      for (let i = 0; i < 6; i++) {
        currentY += 25
        calendarWrapper.dispatchEvent(
          new MouseEvent('mousemove', { clientX: 0, clientY: currentY })
        )
      }

      expect(calendarEventNearEndOfDay.start).toBe('2024-01-05 23:00')
      expect(calendarEventNearEndOfDay.end).toBe('2024-01-05 23:45')
      expect(updateEventSpy).toHaveBeenCalledWith({
        id: 1,
        start: '2024-01-05 23:00',
        end: '2024-01-05 23:45',
      })
    })
  })
})
