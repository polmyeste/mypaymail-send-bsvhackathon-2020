import React, { useState } from 'react';

import getSymbolFromCurrency from 'currency-symbol-map';

import config from '../config';

const VALID_FIRST = /^[1-9]{1}$/;
const VALID_NEXT = /^[0-9]{1}$/;
const DELETE_KEY_CODE = 8;

function showValueWithCurrency(amount, currency) {
  const symbol = getSymbolFromCurrency(currency);

  let value;

  if (symbol) {
    value = `${symbol}${amount}`;
  } else {
    value = `${amount}`;
  }

  return value;
}

const PaymentAmountInput = (props) => {
  const {
    initialAmount,
    initialCurrency,
    register,
    form
  } = props;

  const max = 9999999;

  const valueAbsTrunc = Math.trunc(Math.abs(initialAmount));

  if (initialAmount !== valueAbsTrunc || !Number.isFinite(initialAmount) || Number.isNaN(initialAmount)) {
    throw new Error('Invalid initial amount');
  }

  const [amount, setAmount] = useState(initialAmount);
  const [currency, setCurrency] = useState(initialCurrency);

  const handleAmountKeyDown = (e) => {
    const { key, keyCode } = e;

    if (
      (amount === 0 && !VALID_FIRST.test(key)) ||
      (amount !== 0 && !VALID_NEXT.test(key) && keyCode !== DELETE_KEY_CODE)
    ) {
      return;
    }

    const valueString = amount.toString();

    let nextValue;

    if (keyCode !== DELETE_KEY_CODE) {
      const nextValueString = amount === 0 ? key : `${valueString}${key}`;
      nextValue = Number.parseInt(nextValueString, 10);
    } else {
      const nextValueString = valueString.slice(0, -1);
      nextValue = nextValueString === '' ? 0 : Number.parseInt(nextValueString, 10);
    }

    if (nextValue > max) {
      return;
    }

    setAmount(nextValue);
  }

  const onChangeIgnore = () => {
    form.trigger("amount");
  }

  const amountValue = (amount / 100).toFixed(2);

  const valueDisplay = showValueWithCurrency(amountValue, currency);

  let width = '200px';

  if (valueDisplay.length > 10) {
    width = '400px';
  } else if (valueDisplay.length > 7) {
    width = '350px';
  } else if (valueDisplay.length > 5) {
    width = '250px';
  }

  const style = {
    width,
    fontSize: '60px'
  };

  return (
    <div>
      <input
        inputMode="numeric"
        onChange={onChangeIgnore}
        onKeyDown={handleAmountKeyDown}
        style={style}
        value={valueDisplay}
        className={'currency-input' + (form?.errors?.amount ? ' text-danger' : '')}
      />
      <input
        type="hidden"
        name="amount"
        id="amount"
        value={amountValue}
        onChange={onChangeIgnore}
        ref={register({
          required: true,
          validate: value => (value > 0) && (value < (max / 100).toFixed(2))
        })}
      />
      <div>
        <select
          id="currency"
          name="currency"
          defaultValue={currency}
          className="custom-select currency-select"
          onChange={(e) => setCurrency(e.target.value)}
          ref={register({
            required: true
          })}
        >
          {config.supportedCurrencies.map((supportedCurrency) => {
            const shownValue = supportedCurrency.toUpperCase();

            return (<option key={supportedCurrency} value={supportedCurrency}>{shownValue}</option>)
          })}
        </select>
      </div>
    </div>
  );
};

export default PaymentAmountInput;
