import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'emailToUsername',
})
export class EmailToUsernamePipe implements PipeTransform {
  transform(email: string | undefined): string {
    if (email) {
      return email.split('@' )[0];
    } else {
      return ''
    }
  }
}
