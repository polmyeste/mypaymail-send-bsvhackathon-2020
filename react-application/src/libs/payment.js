
import store from 'store';
import { DateTime } from 'luxon';

class Payment {
  constructor(attributes) {
    this.uuid = attributes.uuid;
    this.state = attributes.state;

    if (this.state === undefined) {
      this.state = 'INITIATED'
    }

    this.outputs = attributes.outputs;
    this.senderEmail = attributes.senderEmail;
    this.expirationDate = attributes.expirationDate;
  }

  completed() {
    this.state = 'COMPLETED';
  }

  saveToLocalStorage() {
    let jsonToStore = {
      uuid: this.uuid,
      state: this.state,
      outputs: this.outputs,
      senderEmail: this.senderEmail
    }

    if (this.expirationDate !== undefined) {
      jsonToStore.expirationDate = this.expirationDate.toISO()
    }

    store.set(Payment.storageKey(), jsonToStore);
  }

  deleteFromLocalStorage() {
    store.remove(Payment.storageKey());
  }

  static storageKey() {
    return 'PAYMENT';
  }

  static fromLocalStorage() {
    const paymentJSON = store.get(Payment.storageKey());

    if (paymentJSON !== undefined) {
      let expirationDate = undefined;

      if (paymentJSON.expirationDate !== undefined) {
        expirationDate = DateTime.fromISO(
          paymentJSON.expirationDate
        );
      }

      return new Payment({
        ...paymentJSON,
        expirationDate
      });
    }

    return null;
  }
}

export default Payment;
