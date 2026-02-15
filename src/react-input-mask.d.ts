declare module 'react-input-mask' {
  import { ComponentType, InputHTMLAttributes } from 'react';

  export interface InputState {
    value: string;
    selection: {
      start: number;
      end: number;
    } | null;
  }

  export interface BeforeMaskedStateChangeStates {
    previousState: InputState;
    currentState: InputState;
    nextState: InputState;
  }

  export interface InputMaskProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    mask: string | Array<string | RegExp>;
    maskChar?: string | null;
    formatChars?: { [key: string]: string };
    alwaysShowMask?: boolean;
    inputRef?: React.Ref<HTMLInputElement>;
    beforeMaskedStateChange?: (states: BeforeMaskedStateChangeStates) => InputState;
    children?: (inputProps: InputHTMLAttributes<HTMLInputElement>) => React.ReactElement;
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  }

  const InputMask: ComponentType<InputMaskProps>;
  export default InputMask;
}
