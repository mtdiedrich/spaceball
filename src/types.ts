export interface StepResponse {
    element: HTMLElement;
    index: number;
    direction: 'up' | 'down';
}

export interface ChartData {
    label: string;
    value: number;
}