import React, { Fragment } from 'react';

const UserMessage = (props) => {
  const { message } = props; 

  return (
    <Fragment>
      <div className={message?.error ? "alert alert-danger" : "alert alert-success"} role="alert">
        {message.title &&
          <h4 className="text-center mb-4 alert-heading">{message.title}</h4>
        }
        {message.text}
      </div>
    </Fragment>
  );
}

export default UserMessage;
