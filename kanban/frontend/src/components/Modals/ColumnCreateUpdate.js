// react imports
import React, { Component } from 'react';

// project imports
import Button from '../UI/Button';

// 3rd party imports
import styled from 'styled-components';
import PropTypes from 'prop-types';

const propTypes = {
  active: PropTypes.bool.isRequired,
  toggleColumnCreateUpdate: PropTypes.func.isRequired,
  editColumnName: PropTypes.func.isRequired,
  createColumn: PropTypes.func.isRequired
};

const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 100%;
  background-color: #000;
  opacity: 0.9;
  z-index: 100;
`;

const Content = styled.div`
  top: 50%;
  left: 50%;
  position: fixed;
  transform: translate(-50%, -50%);
  border-radius: 2px;
  padding: 1rem;
  background-color: #005792;
`;

class ColumnCreateUpdate extends Component {
  state = {
    name: ''
  };

  componentDidMount() {
    if (this.props.name) {
      this.setTaskHandler(this.props.name);
    }
  }

  setTaskHandler = name => {
    this.setState({ name: name });
  };

  render() {
    let saveButton;
    if (this.props.columnIndex === -1) {
      saveButton = (
        <Button
          domProps={{
            id: 'idSaveColumnButton',
            disabled: this.state.name.length === 0,
            onClick: () => this.props.createColumn(this.state.name)
          }}
        >
          Create
        </Button>
      );
    } else {
      saveButton = (
        <Button
          domProps={{
            id: 'idSaveColumnButton',
            disabled: this.state.name.length === 0,
            onClick: () =>
              this.props.editColumnName(this.props.columnIndex, this.state.name)
          }}
        >
          Save
        </Button>
      );
    }

    return (
      <Container>
        <Content>
          <input
            name="name"
            required=""
            id="idName"
            placeholder="Column name..."
            defaultValue={this.props.name}
            onChange={e => this.setTaskHandler(e.target.value)}
          />
          {saveButton}
          <Button
            domProps={{
              onClick: () => this.props.toggleColumnCreateUpdate(false)
            }}
          >
            Cancel
          </Button>
        </Content>
      </Container>
    );
  }
}

ColumnCreateUpdate.propTypes = propTypes;

export default ColumnCreateUpdate;
