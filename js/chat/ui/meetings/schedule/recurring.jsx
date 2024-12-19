import React from 'react';
import { MegaRenderMixin } from '../../../mixins';
import Button from '../button.jsx';
import { CloseDialog, Column, Row, Schedule, UpgradeNotice } from './schedule.jsx';
import Datepicker from './datepicker.jsx';
import Select from './select.jsx';
import ModalDialogsUI from '../../../../ui/modalDialogs.jsx';
import { addMonths, getTimeIntervals, isSameDay } from './helpers.jsx';
import Link from '../../link.jsx';
import { reactStringWrap } from "../../../../ui/utils.jsx";
import { DateTime } from './datetime.jsx';

export default class Recurring extends MegaRenderMixin {
    static NAMESPACE = 'meetings-recurring';
    domRef = React.createRef();

    VIEWS = {
        DAILY: 0x00,
        WEEKLY: 0x01,
        MONTHLY: 0x02
    };

    FREQUENCIES = {
        DAILY: 'd',
        WEEKLY: 'w',
        MONTHLY: 'm'
    };

    WEEK_DAYS = {
        MONDAY: { value: 1, label: l.schedule_day_control_mon },
        TUESDAY: { value: 2, label: l.schedule_day_control_tue },
        WEDNESDAY: { value: 3, label: l.schedule_day_control_wed },
        THURSDAY: { value: 4, label: l.schedule_day_control_thu },
        FRIDAY: { value: 5, label: l.schedule_day_control_fri },
        SATURDAY: { value: 6, label: l.schedule_day_control_sat },
        SUNDAY: { value: 7, label: l.schedule_day_control_sun }
    };

    OFFSETS = [
        [
            l.recur_freq_offset_first_mon || '[A]first[/A][B]Monday[/B]',
            l.recur_freq_offset_first_tue || '[A]first[/A][B]Tuesday[/B]',
            l.recur_freq_offset_first_wed || '[A]first[/A][B]Wednesday[/B]',
            l.recur_freq_offset_first_thu || '[A]first[/A][B]Thursday[/B]',
            l.recur_freq_offset_first_fri || '[A]first[/A][B]Friday[/B]',
            l.recur_freq_offset_first_sat || '[A]first[/A][B]Saturday[/B]',
            l.recur_freq_offset_first_sun || '[A]first[/A][B]Sunday[/B]',
        ],
        [
            l.recur_freq_offset_second_mon || '[A]second[/A][B]Monday[/B]',
            l.recur_freq_offset_second_tue || '[A]second[/A][B]Tuesday[/B]',
            l.recur_freq_offset_second_wed || '[A]second[/A][B]Wednesday[/B]',
            l.recur_freq_offset_second_thu || '[A]second[/A][B]Thursday[/B]',
            l.recur_freq_offset_second_fri || '[A]second[/A][B]Friday[/B]',
            l.recur_freq_offset_second_sat || '[A]second[/A][B]Saturday[/B]',
            l.recur_freq_offset_second_sun || '[A]second[/A][B]Sunday[/B]',
        ],
        [
            l.recur_freq_offset_third_mon || '[A]third[/A][B]Monday[/B]',
            l.recur_freq_offset_third_tue || '[A]third[/A][B]Tuesday[/B]',
            l.recur_freq_offset_third_wed || '[A]third[/A][B]Wednesday[/B]',
            l.recur_freq_offset_third_thu || '[A]third[/A][B]Thursday[/B]',
            l.recur_freq_offset_third_fri || '[A]third[/A][B]Friday[/B]',
            l.recur_freq_offset_third_sat || '[A]third[/A][B]Saturday[/B]',
            l.recur_freq_offset_third_sun || '[A]third[/A][B]Sunday[/B]',
        ],
        [
            l.recur_freq_offset_fourth_mon || '[A]fourth[/A][B]Monday[/B]',
            l.recur_freq_offset_fourth_tue || '[A]fourth[/A][B]Tuesday[/B]',
            l.recur_freq_offset_fourth_wed || '[A]fourth[/A][B]Wednesday[/B]',
            l.recur_freq_offset_fourth_thu || '[A]fourth[/A][B]Thursday[/B]',
            l.recur_freq_offset_fourth_fri || '[A]fourth[/A][B]Friday[/B]',
            l.recur_freq_offset_fourth_sat || '[A]fourth[/A][B]Saturday[/B]',
            l.recur_freq_offset_fourth_sun || '[A]fourth[/A][B]Sunday[/B]',
        ],
        [
            l.recur_freq_offset_fifth_mon || '[A]fifth[/A][B]Monday[/B]',
            l.recur_freq_offset_fifth_tue || '[A]fifth[/A][B]Tuesday[/B]',
            l.recur_freq_offset_fifth_wed || '[A]fifth[/A][B]Wednesday[/B]',
            l.recur_freq_offset_fifth_thu || '[A]fifth[/A][B]Thursday[/B]',
            l.recur_freq_offset_fifth_fri || '[A]fifth[/A][B]Friday[/B]',
            l.recur_freq_offset_fifth_sat || '[A]fifth[/A][B]Saturday[/B]',
            l.recur_freq_offset_fifth_sun || '[A]fifth[/A][B]Sunday[/B]',
        ],
    ];

    // Used to parse string parts from above offset strings e.g; [A]first[/A][B]Monday[/B]
    OFFSET_POS_REGEX = /\[A]([^[]+)\[\/A]/;
    OFFSET_DAY_REGEX = /\[B]([^[]+)\[\/B]/;

    MONTH_RULES = {
        DAY: 'day',
        OFFSET: 'offset'
    };

    initialEnd = addMonths(this.props.startDateTime, 6);
    initialWeekDays = Object.values(this.WEEK_DAYS).map(d => d.value);
    initialMonthDay = this.props.startDateTime ? new Date(this.props.startDateTime).getDate() : undefined;

    state = {
        view: this.VIEWS.DAILY,
        frequency: this.FREQUENCIES.DAILY,
        end: this.initialEnd,
        prevEnd: undefined,
        interval: 0,
        weekDays: this.initialWeekDays,
        monthRule: this.MONTH_RULES.DAY,
        monthDays: [this.initialMonthDay],
        offset: {
            // First Monday as default for offset
            value: 1,
            weekDay: 1
        },
        monthDaysWarning: this.initialMonthDay > 28
    };

    constructor(props) {
        super(props);
        const { chatRoom, startDateTime } = this.props;
        const weekDay = new Date(startDateTime).getDay();
        this.state.offset.weekDay =
            Object.values(this.WEEK_DAYS).find(d => d.value === weekDay)?.value ||
            this.WEEK_DAYS.SUNDAY.value;

        if (chatRoom && chatRoom.scheduledMeeting && chatRoom.scheduledMeeting.isRecurring) {
            const { frequency, interval, end, weekDays, monthDays, offset } = chatRoom.scheduledMeeting.recurring;
            // TODO: refactor, map
            this.state.view = frequency === 'd' ?
                this.VIEWS.DAILY : frequency === 'w' ? this.VIEWS.WEEKLY : this.VIEWS.MONTHLY;
            this.state.frequency = frequency;
            this.state.end = end;
            this.state.interval = interval;
            this.state.weekDays = weekDays && weekDays.length ? weekDays : this.initialWeekDays;
            this.state.monthRule = monthDays && monthDays.length ? this.MONTH_RULES.DAY : this.MONTH_RULES.OFFSET;
            this.state.monthDays = monthDays && monthDays.length ? [monthDays[0]] : [this.initialMonthDay];
            this.state.offset = offset && Object.keys(offset).length ? offset : this.state.offset;
        }
    }

    getFormattedState(state) {
        // [...] TODO: refactor re: conditional property assignments
        const { frequency, end, interval, weekDays, monthRule, monthDays, offset } = state;
        switch (true) {
            case frequency === this.FREQUENCIES.DAILY:
                return { frequency, end, weekDays };
            case frequency === this.FREQUENCIES.WEEKLY:
                return {
                    frequency,
                    end,
                    ...interval && { interval },
                    weekDays
                };
            case frequency === this.FREQUENCIES.MONTHLY:
                return {
                    frequency,
                    end,
                    ...interval && { interval },
                    ...monthRule === this.MONTH_RULES.DAY ? { monthDays } : { offset: [[offset.value, offset.weekDay]] }
                };
        }
    }

    toggleView = (view, frequency, state) => this.props.isLoading ? null : this.setState({ view, frequency, ...state });

    renderDayControls() {
        const { weekDays, view } = this.state;
        // [...] TODO: separate component with its own methods
        const handleWeeklySelection = (weekDay, remove) => {
            this.setState(
                state => {
                    if (remove) {
                        return {
                            weekDays:
                            // At least one week day must be selected
                                state.weekDays.length === 1 ? state.weekDays : state.weekDays.filter(d => d !== weekDay)
                        };
                    }
                    return { weekDays: [...state.weekDays, weekDay] };
                },
                () => {
                    // Switch to `Daily` if all week days have been selected
                    const { weekDays } = this.state;
                    if (weekDays.length === Object.keys(this.WEEK_DAYS).length) {
                        this.toggleView(this.VIEWS.DAILY, this.FREQUENCIES.DAILY);
                    }
                }
            );
        };
        const handleDailySelection = weekDay => {
            this.toggleView(this.VIEWS.WEEKLY, this.FREQUENCIES.WEEKLY, {
                weekDays: weekDays.filter(d => d !== weekDay)
            });
        };

        return (
            <div className="recurring-field-row">
                {Object.values(this.WEEK_DAYS).map(({ value, label }) => {
                    const isCurrentlySelected = weekDays.includes(value);
                    return (
                        <Button
                            key={value}
                            className={`
                                mega-button
                                action
                                recurring-toggle-button
                                ${isCurrentlySelected ? 'active' : ''}
                                ${weekDays.length === 1 && isCurrentlySelected ? 'disabled' : ''}
                            `}
                            onClick={this.props.isLoading ? null : () => {
                                if (view === this.VIEWS.WEEKLY) {
                                    return handleWeeklySelection(value, isCurrentlySelected);
                                }
                                return handleDailySelection(value);
                            }}>
                            {label}
                        </Button>
                    );
                })}
            </div>
        );
    }

    MonthDaySelect = ({ offset }) => {
        const dayIdx = (offset && offset.weekDay || 1) - 1;
        const posIdx = (offset && offset.value || 1) - 1;
        // Options must match the selected value of the other select.
        // Day values are extracted from the [B] portion of the string
        const dayValues = this.OFFSETS[posIdx].map((part, idx) => ({
            value: idx + 1,
            label: this.OFFSET_DAY_REGEX.exec(part)[1]
        }));
        const posValues = [];
        // Pos values are extracted from the [A] portion of the string
        for (let i = 0; i < this.OFFSETS.length; i++) {
            posValues.push({
                value: i + 1,
                label: this.OFFSET_POS_REGEX.exec(this.OFFSETS[i][dayIdx])[1]
            });
        }

        // Handle possibly different positions of the strings from translations.
        const posFirst = this.OFFSETS[posIdx][dayIdx].indexOf('[A]') < this.OFFSETS[posIdx][dayIdx].indexOf('[B]');
        const pos = (
            <Select
                name="recurring-offset-value"
                className="inline"
                icon={true}
                value={posValues[posIdx].label}
                isLoading={this.props.isLoading}
                options={posValues}
                onSelect={option => {
                    this.setState(state => ({
                        monthRule: this.MONTH_RULES.OFFSET,
                        offset: {
                            value: option.value,
                            weekDay: state.offset.weekDay || this.WEEK_DAYS.MONDAY.value
                        }
                    }));
                }}
            />
        );

        return (
            <>
                {posFirst && pos}
                <Select
                    name="recurring-offset-day"
                    className="inline"
                    icon={true}
                    value={dayValues[dayIdx].label}
                    isLoading={this.props.isLoading}
                    options={dayValues}
                    onSelect={option => {
                        this.setState(state => ({
                            monthRule: this.MONTH_RULES.OFFSET,
                            offset: {
                                value: state.offset.value || 1,
                                weekDay: option.value
                            }
                        }));
                    }}
                />
                {!posFirst && pos}
            </>
        );
    };

    IntervalSelect = () => {
        const { interval, view } = this.state;

        return (
            <div className="mega-input inline recurring-interval">
                <Select
                    name={`${Recurring.NAMESPACE}-interval`}
                    value={interval > 0 ? interval : 1}
                    icon={true}
                    isLoading={this.props.isLoading}
                    options={[...Array(view === this.VIEWS.WEEKLY ? 52 : 12).keys()].map(value => {
                        value += 1;
                        return { value, label: value };
                    })}
                    onSelect={({ value }) => {
                        this.setState({ interval: value === 1 ? 0 : value });
                    }}
                />
            </div>
        );
    };

    renderIntervalControls() {
        const { view, interval } = this.state;
        return (
            <div className="recurring-field-row">
                {
                    reactStringWrap(
                        mega.icu.format(
                            /* `Occurs every [S][/S] [month|week](s)` */
                            view === this.VIEWS.MONTHLY ? l.recur_rate_monthly : l.recur_rate_weekly,
                            interval > 0 ? interval : 1
                        ),
                        "[S]",
                        this.IntervalSelect
                    )
                }
            </div>
        );
    }

    renderEndControls() {
        const { isLoading, onMount } = this.props;
        const { end, prevEnd } = this.state;

        return (
            <div className="recurring-field-row">
                <div className="recurring-title-heading">{l.recurring_ends}</div>
                <div className="recurring-radio-buttons">
                    <div className="recurring-label-wrap">
                        <div
                            className={`
                                uiTheme
                                ${end ? 'radioOff' : 'radioOn'}
                            `}>
                            <input
                                type="radio"
                                name={`${Recurring.NAMESPACE}-radio-end`}
                                disabled={isLoading}
                                className={`
                                    uiTheme
                                    ${end ? 'radioOff' : 'radioOn'}
                                `}
                                onChange={() => {
                                    this.setState(state => ({ end: undefined, prevEnd: state.end || state.prevEnd }));
                                }}
                            />
                        </div>
                        <div className="radio-txt">
                            <span
                                className="recurring-radio-label"
                                onClick={() =>
                                    isLoading ?
                                        null :
                                        this.setState(state => ({
                                            end: undefined,
                                            prevEnd: state.end || state.prevEnd
                                        }))
                                }>
                                {l.recurring_never}
                            </span>
                        </div>
                    </div>
                    <div className="recurring-label-wrap">
                        <div
                            className={`
                                uiTheme
                                ${end ? 'radioOn' : 'radioOff'}
                            `}>
                            <input
                                type="radio"
                                name={`${Recurring.NAMESPACE}-radio-end`}
                                disabled={isLoading}
                                className={`
                                    uiTheme
                                    ${end ? 'radioOn' : 'radioOff'}
                                `}
                                onChange={() => isLoading ? null : this.setState({ end: prevEnd || this.initialEnd })}
                            />
                        </div>
                        <div className="radio-txt">
                            <span
                                className="recurring-radio-label"
                                onClick={() =>
                                    isLoading || end ? null : this.setState({ end: prevEnd || this.initialEnd })
                                }>
                                {l.recurring_on}
                            </span>
                            <Datepicker
                                name={`${Recurring.NAMESPACE}-endDateTime`}
                                position="top left"
                                startDate={end || this.initialEnd}
                                selectedDates={[new Date(end)]}
                                isLoading={isLoading}
                                value={end || prevEnd || ''}
                                placeholder={time2date(end || prevEnd || this.initialEnd / 1000, 18)}
                                onMount={onMount}
                                onSelect={timestamp => this.setState({ end: timestamp }, () => this.safeForceUpdate())}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    renderDaily() {
        return (
            <div className={`${Recurring.NAMESPACE}-daily`}>
                {this.renderDayControls()}
                {this.renderEndControls()}
            </div>
        );
    }

    renderWeekly() {
        return (
            <div className={`${Recurring.NAMESPACE}-weekly`}>
                {this.renderIntervalControls()}
                {this.renderDayControls()}
                {this.renderEndControls()}
            </div>
        );
    }

    renderMonthly() {
        const { isLoading } = this.props;
        const { monthRule, monthDays, monthDaysWarning, offset } = this.state;

        return (
            <div className={`${Recurring.NAMESPACE}-monthly`}>
                {this.renderIntervalControls()}
                <div className="recurring-field-row">
                    <div
                        className="recurring-radio-buttons"
                        onClick={
                            isLoading ?
                                null :
                                ev => {
                                    const { name, value } = ev.target;
                                    if (name === `${Recurring.NAMESPACE}-radio-monthRule`) {
                                        this.setState({ monthRule: value });
                                    }
                                }
                        }>
                        <div className="recurring-label-wrap">
                            <div
                                className={`
                                    uiTheme
                                    ${monthRule === 'day' ? 'radioOn' : 'radioOff'}
                                `}>
                                <input
                                    type="radio"
                                    name={`${Recurring.NAMESPACE}-radio-monthRule`}
                                    value="day"
                                    disabled={isLoading}
                                    className={`
                                        uiTheme
                                        ${monthRule === 'day' ? 'radioOn' : 'radioOff'}
                                    `}
                                />
                            </div>
                            <div className="radio-txt">
                                <span
                                    className="recurring-radio-label"
                                    onClick={() =>
                                        isLoading ? null : this.setState({ monthRule: this.MONTH_RULES.DAY })
                                    }>
                                    {l.recurring_frequency_day}
                                </span>
                                <div className="mega-input inline recurring-day">
                                    <Select
                                        name={`${Recurring.NAMESPACE}-monthDay`}
                                        icon={true}
                                        value={monthDays[0]}
                                        isLoading={isLoading}
                                        options={[...Array(31).keys()].map(value => {
                                            value += 1;
                                            return { value, label: value };
                                        })}
                                        onSelect={({ value }) => {
                                            this.setState({
                                                monthRule: this.MONTH_RULES.DAY,
                                                monthDays: [value],
                                                monthDaysWarning: value > 28
                                            });
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                        {monthDaysWarning &&
                            <div className="recurring-label-wrap">
                                <div className="mega-banner body with-btn">
                                    <div className="green-notification cell text-cell">
                                        <div className="versioning-body-text">
                                            {mega.icu.format(l.recurring_monthdays_warning, monthDays[0])}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        }
                        <div className="recurring-label-wrap">
                            <div
                                className={`
                                    uiTheme
                                    ${monthRule === this.MONTH_RULES.OFFSET ? 'radioOn' : 'radioOff'}
                                `}>
                                <input
                                    type="radio"
                                    name={`${Recurring.NAMESPACE}-radio-monthRule`}
                                    value="offset"
                                    disabled={isLoading}
                                    className={`
                                        uiTheme
                                        ${monthRule === this.MONTH_RULES.OFFSET ? 'radioOn' : 'radioOff'}
                                    `}
                                />
                            </div>
                            <div className="radio-txt">
                                <this.MonthDaySelect offset={offset} />
                            </div>
                        </div>
                    </div>
                </div>
                {this.renderEndControls()}
            </div>
        );
    }

    renderNavigation(view) {
        return (
            <>
                <Button
                    className={`
                        mega-button
                        action
                        recurring-nav-button
                        ${view === this.VIEWS.DAILY ? 'active' : ''}
                    `}
                    onClick={() => this.toggleView(this.VIEWS.DAILY, this.FREQUENCIES.DAILY)}>
                    {l.recurring_daily}
                </Button>
                <Button
                    className={`
                        mega-button
                        action
                        recurring-nav-button
                        ${view === this.VIEWS.WEEKLY ? 'active' : ''}
                    `}
                    onClick={() => this.toggleView(this.VIEWS.WEEKLY, this.FREQUENCIES.WEEKLY)}>
                    {l.recurring_weekly}
                </Button>
                <Button
                    className={`
                        mega-button
                        action
                        recurring-nav-button
                        ${view === this.VIEWS.MONTHLY ? 'active' : ''}
                    `}
                    onClick={() => this.toggleView(this.VIEWS.MONTHLY, this.FREQUENCIES.MONTHLY)}>
                    {l.recurring_monthly}
                </Button>
            </>
        );
    }

    renderContent(view) {
        switch (view) {
            case this.VIEWS.DAILY:
                return this.renderDaily();
            case this.VIEWS.WEEKLY:
                return this.renderWeekly();
            case this.VIEWS.MONTHLY:
                return this.renderMonthly();
        }
    }

    // [...] Remove and refactor to separate components?
    UNSAFE_componentWillUpdate(nextProps, nextState) {
        // Navigate to `Daily` -> reset selected week days
        if (this.state.view !== this.VIEWS.DAILY && nextState.view === this.VIEWS.DAILY) {
            nextState.weekDays = this.initialWeekDays;
        }

        // Navigate to `Weekly` or change main meeting's start date -> reset selected week days; set currently
        // selected day of the week based on the main meeting's date.
        if (
            // Week days haven't been already updated from the `Daily` tab
            nextState.weekDays.length === Object.keys(this.WEEK_DAYS).length &&
            // Navigating to `Weekly` from another tab
            this.state.view !== this.VIEWS.WEEKLY && nextState.view === this.VIEWS.WEEKLY ||
            // Updating the main meeting date while currently on the `Weekly` tab
            !isSameDay(nextProps.startDateTime, this.props.startDateTime) && this.state.view === this.VIEWS.WEEKLY
        ) {
            // Date.prototype.getDate()    | API
            // -------------------------------------------------------
            // Sunday ~ Saturday -> 0 ~ 6  | Monday ~ Sunday -> 1 ~ 7
            //  ------------------------------------------------------
            const weekday = new Date(nextProps.startDateTime).getDay();
            nextState.weekDays = [weekday === 0 /* Sunday */ ? 7 : weekday];
        }

        // Set `On day {1|2|3...}` and `The {FIRST|SECOND|THIRD...} {Monday|Tuesday|Wednesday...}` when updating
        // the main meeting's start date
        if (!isSameDay(nextProps.startDateTime, this.props.startDateTime) && this.state.view === this.VIEWS.MONTHLY) {
            const nextDate = new Date(nextProps.startDateTime);
            nextState.monthDays = [nextDate.getDate()];
            nextState.offset.weekDay =
                Object.values(this.WEEK_DAYS).find(d => d.value === nextDate.getDay())?.value ||
                this.WEEK_DAYS.SUNDAY.value;
            nextState.monthDaysWarning = nextState.monthDays > 28;
        }

        // Reset interval when selecting `Monthly` if the current interval is more than `12`, e.g. 52 weeks
        if (nextState.view === this.VIEWS.MONTHLY && this.state.interval > 12) {
            nextState.interval = 12;
        }

        // Format state for the API
        this.props.onUpdate(this.getFormattedState(nextState));
    }

    componentDidMount() {
        super.componentDidMount();
        this.props.onUpdate(this.getFormattedState(this.state));
    }

    render() {
        const { NAMESPACE } = Recurring;
        const { view } = this.state;

        return (
            <Row>
                <Column />
                <Column>
                    <div
                        ref={this.domRef}
                        className={`
                            ${NAMESPACE}
                            ${this.props.isLoading ? 'disabled' : ''}
                        `}>
                        <div className={`${NAMESPACE}-container`}>
                            <div className={`${NAMESPACE}-navigation`}>
                                {this.renderNavigation(view)}
                            </div>
                            <div className={`${NAMESPACE}-content`}>
                                {this.renderContent(view)}
                            </div>
                        </div>
                    </div>
                </Column>
            </Row>
        );
    }
}

// --

export class Edit extends MegaRenderMixin {
    occurrenceRef = null;
    datepickerRefs = [];

    interval = ChatRoom.SCHEDULED_MEETINGS_INTERVAL;
    incomingCallListener = 'onPrepareIncomingCallDialog.recurringEdit';

    state = {
        startDateTime: undefined,
        endDateTime: undefined,
        isDirty: false,
        closeDialog: false,
        overlayed: false,
    };

    constructor(props) {
        super(props);

        // --

        const { scheduledMeeting, occurrenceId } = this.props;
        this.occurrenceRef = scheduledMeeting.occurrences[occurrenceId];
        if (this.occurrenceRef) {
            this.state.startDateTime = this.occurrenceRef.start;
            this.state.endDateTime = this.occurrenceRef.end;
        }
    }

    onStartDateSelect = startDateTime => {
        this.setState({ startDateTime, isDirty: true }, () => {
            this.datepickerRefs.endDateTime.selectDate(new Date(startDateTime + this.interval));
        });
    };

    onEndDateSelect = endDateTime => {
        this.setState({ endDateTime, isDirty: true }, () => {
            const { startDateTime, endDateTime } = this.state;
            if (endDateTime < startDateTime) {
                if (endDateTime < Date.now()) {
                    return this.setState({ endDateTime: startDateTime + this.interval });
                }
                this.handleTimeSelect({ startDateTime: endDateTime - this.interval });
            }
        });
    };

    // [...] TODO: unify w/ the behavior on `Schedule` re: date/time selection handing
    handleTimeSelect = ({ startDateTime, endDateTime }) => {
        startDateTime = startDateTime || this.state.startDateTime;
        endDateTime = endDateTime || this.state.endDateTime;
        this.setState(state => {
            return {
                startDateTime: endDateTime <= state.startDateTime ? endDateTime - this.interval : startDateTime,
                endDateTime: startDateTime >= state.endDateTime ? startDateTime + this.interval : endDateTime,
                isDirty: true
            };
        });
    };

    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.incomingCallListener) {
            megaChat.off(this.incomingCallListener);
        }
        if ($.dialog === Schedule.dialogName) {
            closeDialog();
        }
    }

    componentDidMount() {
        super.componentDidMount();
        M.safeShowDialog(Schedule.dialogName, () => {
            if (!this.isMounted()) {
                throw Error(`Edit dialog: component not mounted.`);
            }

            megaChat.rebind(this.incomingCallListener, () => {
                // If the incoming call dialog will show mark this as overlayed.
                if (this.isMounted()) {
                    this.setState({ overlayed: true, closeDialog: false });
                    // Clear when ringing stops.
                    megaChat.plugins.callManager2.rebind('onRingingStopped.recurringEdit', () => {
                        megaChat.plugins.callManager2.off('onRingingStopped.recurringEdit');
                        this.setState({ overlayed: false });
                        fm_showoverlay();
                    });
                }
            });

            return $(`#${Schedule.NAMESPACE}`);
        });
    }

    componentDidUpdate(prevProps) {
        if (prevProps.callExpanded && !this.props.callExpanded) {
            if (!$.dialog) {
                // The call opening clears $.dialog so since the dialog is still mounted update it.
                M.safeShowDialog(Schedule.dialogName, `#${Schedule.NAMESPACE}`);
            }
            fm_showoverlay();
            this.setState({ closeDialog: false });
        }
        if (!prevProps.callExpanded && this.props.callExpanded) {
            this.setState({ closeDialog: false });
        }
    }

    render() {
        const { chatRoom, callExpanded, onClose } = this.props;
        const { startDateTime, endDateTime, isDirty, closeDialog, overlayed } = this.state;

        const dialogClasses = ['fluid'];
        if (closeDialog) {
            dialogClasses.push('with-confirmation-dialog');
        }
        if (callExpanded || overlayed) {
            dialogClasses.push('hidden');
        }
        const withUpgrade = !u_attr.p && endDateTime - startDateTime > 36e5;
        if (withUpgrade) {
            dialogClasses.push('upgrade');
        }

        return (
            <ModalDialogsUI.ModalDialog
                {...this.state}
                id={Schedule.NAMESPACE}
                className={dialogClasses.join(' ')}
                dialogName={Schedule.dialogName}
                dialogType="main"
                onClose={() => {
                    return isDirty ? this.setState({ closeDialog: true }) : onClose();
                }}>
                <header>
                    <h2>{l.edit_meeting_title}</h2>
                </header>
                <div className="fm-dialog-body">
                    <Row>
                        <div className="mega-banner body recurring-edit-banner">
                            <div className="cell">
                                {reactStringWrap(l.scheduled_edit_occurrence_note, '[A]', Link, {
                                    onClick: () => {
                                        onClose();
                                        megaChat.trigger(megaChat.plugins.meetingsManager.EVENTS.EDIT, chatRoom);
                                    }
                                })}
                            </div>
                        </div>
                    </Row>
                    <Row className="start-aligned">
                        <Column>
                            <i className="sprite-fm-mono icon-recents-filled" />
                        </Column>
                        <div className="schedule-date-container">
                            <DateTime
                                name="startDateTime"
                                altField="startTime"
                                datepickerRef={this.datepickerRefs.startDateTime}
                                startDate={startDateTime}
                                value={startDateTime}
                                filteredTimeIntervals={getTimeIntervals(startDateTime)}
                                label={l.schedule_start_date /* `Start date` */}
                                onMount={datepicker => {
                                    this.datepickerRefs.startDateTime = datepicker;
                                }}
                                onSelectDate={startDateTime => this.onStartDateSelect(startDateTime)}
                                onSelectTime={({ value: startDateTime }) => this.handleTimeSelect({ startDateTime })}
                                onChange={value => this.setState({ startDateTime: value })}
                                onBlur={timestamp => {
                                    if (timestamp) {
                                        timestamp = timestamp < Date.now() ? this.occurrenceRef.start : timestamp;
                                        this.onStartDateSelect(timestamp);
                                    }
                                }}
                            />

                            <DateTime
                                name="endDateTime"
                                altField="endTime"
                                datepickerRef={this.datepickerRefs.endDateTime}
                                startDate={endDateTime}
                                value={endDateTime}
                                filteredTimeIntervals={getTimeIntervals(endDateTime, startDateTime)}
                                label={l.schedule_end_date /* `End date` */}
                                onMount={datepicker => {
                                    this.datepickerRefs.endDateTime = datepicker;
                                }}
                                onSelectDate={endDateTime => this.onEndDateSelect(endDateTime)}
                                onSelectTime={({ value: endDateTime }) => this.handleTimeSelect({ endDateTime })}
                                onChange={timestamp => this.setState({ endDateTime: timestamp })}
                                onBlur={timestamp => timestamp && this.onEndDateSelect(timestamp)}
                            />
                        </div>
                    </Row>

                    {
                        withUpgrade &&
                        <UpgradeNotice
                            onUpgradeClicked={() => {
                                onClose();
                                loadSubPage('pro');
                                eventlog(500257);
                            }}
                        />
                    }

                </div>
                <footer>
                    <div className="footer-container">
                        <Button
                            className="mega-button positive"
                            onClick={() => {
                                const { startDateTime, endDateTime } = this.state;
                                if (
                                    startDateTime !== this.occurrenceRef.start || endDateTime !== this.occurrenceRef.end
                                ) {
                                    delay('chat-event-sm-edit-meeting', () => eventlog(99923));
                                    this.occurrenceRef.update(startDateTime, endDateTime);
                                }
                                onClose();
                            }}>
                            <span>{l.update_meeting_button}</span>
                        </Button>
                    </div>
                </footer>

                {!(overlayed || callExpanded) && closeDialog &&
                    <CloseDialog
                        onToggle={() => this.setState({ closeDialog: false })}
                        onClose={onClose}
                    />
                }
            </ModalDialogsUI.ModalDialog>
        );
    }
}
