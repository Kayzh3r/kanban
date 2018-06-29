// react imports
import React, { Component } from 'react';

// project imports
import Card from '../../components/Card/Card';
import { DragTypes } from '../../DragTypes';
import Controls from './Controls';
import RenameModal from '../../components/Modals/ColumnCreateUpdate';
import * as actions from './actions';

// 3rd party imports
import styled from 'styled-components';
import { DropTarget } from 'react-dnd';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

const propTypes = {
  columnIndex: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  cards: PropTypes.array.isRequired,
  reorderCard: PropTypes.func.isRequired,
  moveCard: PropTypes.func.isRequired,
  toggleColumn: PropTypes.func.isRequired,
  toggleColumnCreateUpdate: PropTypes.func.isRequired,
  toggleCardCreateUpdate: PropTypes.func.isRequired,
  toggleConfirm: PropTypes.func.isRequired,
  deleteColumn: PropTypes.func.isRequired
};

const ColumnContainer = styled.div`
  margin: 10px;
  border-radius: 2px;
  background-color: #00204a;
  display: flex;
  flex-direction: column;
  flex: 1;
  .fa-spinner {
    color: #fd5f00;
  }
`;

const Header = styled.h2`
  align-self: center;
  border-bottom: 1px solid #fd5f00;
`;

const columnTarget = {
  drop(props, monitor, component) {
    if (monitor.getItem().columnIndex !== props.columnIndex) {
      props.moveCard(
        monitor.getItem().columnIndex,
        monitor.getItem().cardIndex,
        props.columnIndex
      );
    } else {
      const args = {
        hasDropped: true,
        columnIndex: monitor.getItem().columnIndex,
        toCardIndex: monitor.getItem().cardIndex
      };
      props.reorderCard(args);
    }
  }
};

function collect(connect, monitor) {
  return {
    connectDropTarget: connect.dropTarget()
  };
}

class Column extends Component {
  state = {
    renameModal: false
  };

  // used to display / hide the rename modal
  toggleRenameModal = () => {
    this.setState({ renameModal: !this.state.renameModal });
  };

  // dispatch renameColumn if column name was changed
  handleRename = name => {
    this.toggleRenameModal();
    if (name !== this.props.name) {
      this.props.renameColumn(this.props.id, name);
    }
  };

  render() {
    const { connectDropTarget } = this.props;

    let renameModal = null;
    if (this.state.renameModal) {
      renameModal = (
        <RenameModal
          name={this.props.name}
          toggleModal={this.toggleRenameModal}
          renameColumn={this.handleRename}
        />
      );
    }

    const header = this.props.spinner ? (
      <Header>
        <i className="fas fa-spinner fa-spin" />
      </Header>
    ) : (
      <Header>{this.props.name}</Header>
    );

    // const cards = props.cards.map((card, index) => (
    //   <Card
    //     key={card.id}
    //     cardIndex={index}
    //     columnIndex={props.columnIndex}
    //     task={card.task}
    //     spinner={card.spinner}
    //     deleteCard={props.deleteCard}
    //     reorderCard={props.reorderCard}
    //     toggleCardCreateUpdate={props.toggleCardCreateUpdate}
    //   />
    // ));

    return (
      <ColumnContainer innerRef={node => connectDropTarget(node)}>
        {renameModal}
        <Controls
          toggleColumn={this.props.toggleColumn}
          toggleCardCreateUpdate={this.props.toggleCardCreateUpdate}
          toggleRenameModal={this.toggleRenameModal}
          toggleConfirm={this.props.toggleConfirm}
          columnIndex={this.props.columnIndex}
          deleteColumn={this.props.deleteColumn}
        />
        {header}
        {/* {cards} */}
      </ColumnContainer>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  return {
    name: state.columns[ownProps.id].name,
    spinner: state.columns[ownProps.id].spinner
  };
};

const mapDispatchToProps = dispatch => {
  return {
    renameColumn: (id, name) => dispatch(actions.renameColumn(id, name))
  };
};

Column.propTypes = propTypes;

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DropTarget(DragTypes.CARD, columnTarget, collect)(Column));
