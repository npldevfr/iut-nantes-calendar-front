import {IExtendedProps} from "~/types/ExtendedProps";

export interface IEvent {
    id: string;
    title: string;
    start: Date | string;
    end: Date | string;
    allDay: boolean;
    extendedProps: IExtendedProps;
}