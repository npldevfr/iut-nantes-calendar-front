import {defineStore} from "pinia";
import data from "~/data/apicalendar.json"
import {IEvent} from "~/types/Event.interface";
import moment from "moment/moment";
import {IWeek} from "~/types/Week.interface";
import {useWeekInterval} from "~/composables/useWeekInterval";
import {IWeekInterval} from "~/types/WeekInterval.interface";
import {IDay} from "~/types/Day.interface";
import {EVENT_BLACKLIST_WORDS, HOURS} from "~/global.config";

interface CalendarStoreState {
    weekInterval: IWeekInterval;
    calendar: any;
    selectedEvent: IEvent | {};
}

export const useCalendarStore = defineStore('calendar', {
    state: (): CalendarStoreState => ({
        weekInterval: {start: moment().startOf('isoWeek'), end: moment().endOf('isoWeek')} as IWeekInterval,
        calendar: [] as IWeek[],
        selectedEvent: {} as IEvent,
    }),
    getters: {
        getWeekInterval: (state: CalendarStoreState): IWeekInterval => {
            return state.weekInterval
        },
        getCalendar: (state: CalendarStoreState): IWeek[] => {
            return state.calendar
        },
        getSelectedEvent: (state: CalendarStoreState) => state.selectedEvent,
        getEventById: (state: CalendarStoreState) => (id: string): IEvent => {
            if (!id) return {} as IEvent
            return state.calendar.flatMap((week: IWeek) => week.days).flatMap((day: IDay) => day.events).find((event: IEvent) => event.id === id)
        },
        /** Retourne la liste des événements à venir **/
        getFollowingEvents: (state: CalendarStoreState) => (uuid: string): IEvent[] => {
            if (!uuid) return []
            const eventById = useCalendarStore().getEventById(uuid);
            if (!eventById) return [];
            const followingEvents = state.calendar.flatMap((week: IWeek) => week.days).flatMap((day: IDay) => day.events).filter((event: IEvent) => {
                return moment(event.start).isAfter(moment()) && event.title === eventById.title
            });

            // On trie les événements par date
            return followingEvents.sort((a: IEvent, b: IEvent) => {
                return moment(a.start).isAfter(moment(b.start)) ? 1 : -1
            });
        },
        /** Retourne la liste des événements pour la semaine selectionnée **/
        getEventsForWeek: (state: CalendarStoreState) => {
            const weeks = state.calendar;
            const {start, end} = state.weekInterval;
            if (!weeks) return [];

            return weeks.filter((week: IWeek) => {
                return moment(week.firstDayOfWeek).isBetween(start, end, null, '[]')
            })[0]
        },
        getCalendarHours: (): string[] => {
            return HOURS;
        },
        getDatesInWeek: (state: CalendarStoreState) => {
            const {start, end} = state.weekInterval;
            const dates = [];
            // get dates between start and end
            for (let m = moment(start); m.isBefore(end); m.add(1, 'days')) {
                dates.push(m.format('YYYY-MM-DD'));
            }
            return dates;
        },
        getFormatEventByWeek: () => {
            const events = useCalendarStore().getEventsForWeek;
            const dates = useCalendarStore().getDatesInWeek;

            if (!events) {
                return dates.map((date: string) => {
                    return {
                        date,
                        events: []
                    }
                })
            } else {


                const groupedEventsByDates = dates.map((date: string) => {
                    return {
                        date,
                        events: events.days.find((day: IDay) => day.date === date)?.events || []
                    }
                })

                const mergedEvents = groupedEventsByDates.map((day: IDay) => {
                    const mergedEvents = day.events.reduce((acc: IEvent[], event: IEvent) => {
                        const lastEvent = acc[acc.length - 1];
                        if (lastEvent && lastEvent.title === event.title && moment(event.start).diff(moment(lastEvent.end), 'hours') < 1) {
                            lastEvent.end = event.end;
                            return acc;
                        }
                        return [...acc, event];
                    }, []);
                    return {...day, events: mergedEvents}
                })

                return mergedEvents;
            }
        },
        /** Retourne le temps total de la semaine selectionnée **/
        getTotalHoursForWeek: (): string => {
            const events = useCalendarStore().getEventsForWeek;
            if (!events) return '0h';

            //count hours and minutes of all events and if name is near to a blacklisted word, don't count it
            const totalHours = events.days.flatMap((day: IDay) => day.events).reduce((acc: number, event: IEvent) => {
                if (EVENT_BLACKLIST_WORDS.some((word: string) => event.title.includes(word))) return acc;
                return acc + moment(event.end).diff(moment(event.start), 'hours', true);
            })

            return `${Math.floor(totalHours)}h${Math.round((totalHours % 1) * 60)}`


        },
    },
    actions: {
        GO_BACK_TO_TODAY(): void {
            this.weekInterval = useWeekInterval();
        },
        PREVIOUS_WEEK(): void {
            this.weekInterval = useWeekInterval('previous', this.weekInterval);
        },
        NEXT_WEEK(): void {
            this.weekInterval = useWeekInterval('next', this.weekInterval);
        },
        FETCH_CALENDAR(personaId: string = ""): void {
            const {data: fetchedCalendar} = data;
            this.calendar = fetchedCalendar;
        },
        SET_SELECTED_EVENT(event?: IEvent): void {
            this.selectedEvent = event || {};
        },
    },
});
