import React from 'react';

import {
  Navbar as ReactNavbar,
  Nav,
  NavItem,
  Container
} from 'reactstrap';

import logo from './logo.svg';

const Navbar = () => {
  return (
    <ReactNavbar color="primary" light expand="md">
      <Container className="p-2 pr-3 pl-3">
        <Nav className="mr-auto">
          <NavItem>
            <img className="img-fluid logo" src={logo} alt="Logo" />
          </NavItem>
        </Nav>
      </Container>
    </ReactNavbar>
  );
}

export default Navbar;