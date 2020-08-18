import React, { useState, useEffect, useContext } from "react";

export const ClientDataContext = React.createContext();

export const useClientData = () => useContext(ClientDataContext);

export const ClientDataProvider = (props) => {
  const { children } = props;

  const [clientData, setClientData] = useState(null);

  useEffect(() => {
    const clientDataDomElement = document.getElementById('client-data');

    if (!clientDataDomElement) {
      throw new Error('Client data DOM element must be present');
    }

    const parsedClientData = JSON.parse(
      clientDataDomElement.innerHTML
    );

    setClientData(parsedClientData);
    // eslint-disable-next-line
  }, []);

  if (clientData === null) {
    return '';
  }

  return (
    <ClientDataContext.Provider
      value={{
        clientData
      }}
    >
      {children}
    </ClientDataContext.Provider>
  )
};
