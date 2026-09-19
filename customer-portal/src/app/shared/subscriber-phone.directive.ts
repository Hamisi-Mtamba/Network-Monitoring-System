import { Directive, ElementRef, HostListener, inject } from '@angular/core';

@Directive({ selector: 'input[nmsSubscriberPhone]', standalone: true })
export class SubscriberPhoneDirective {
    private readonly element = inject<ElementRef<HTMLInputElement>>(ElementRef);

    private allowsInsertion(text: string): boolean {
        const input = this.element.nativeElement;
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? start;
        const candidate = input.value.slice(0, start) + text + input.value.slice(end);
        return /^(?:[67]\d{0,8})?$/.test(candidate);
    }

    @HostListener('beforeinput', ['$event'])
    beforeInput(event: InputEvent): void {
        if (event.inputType.startsWith('insert') && event.data !== null && !this.allowsInsertion(event.data)) {
            event.preventDefault();
        }
    }

    @HostListener('paste', ['$event'])
    paste(event: ClipboardEvent): void {
        // Reject the whole invalid paste before maxlength can truncate it
        // into a different, valid phone number.
        if (event.clipboardData && !this.allowsInsertion(event.clipboardData.getData('text'))) {
            event.preventDefault();
        }
    }
}
