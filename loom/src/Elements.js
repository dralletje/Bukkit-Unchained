import React from 'react';
import styled from 'styled-components';

export let Flex = React.forwardRef(({ row, column, style, ...props }, ref) => {
  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        flexDirection: row === true ? "row" : "column",
        ...style,
      }}
      {...props}
    />
  );
});

export let SubtleButton = styled.div`
  color: rgba(255,255,255,.3);
  background-color: transparent;
  transition: all 0.2s;
  border-radius: 2px;

  display: flex;
  padding: 8px;

  .show-on-button-hover {
    opacity: 0;
    transition: all 0.2s;
  }

  &:hover {
    cursor: pointer;
    background-color: rgba(255,255,255,.05);
    color: #bebdbd;

    .show-on-button-hover {
      opacity: 1;
    }
  }
`;

export let Card = styled.div`
  background: #fff;
  box-shadow: 0 6px 8px rgba(102, 119, 136, 0.03),
    0 1px 2px rgba(102, 119, 136, 0.3);
  border-radius: 2px;
`;

export let Title = styled.h3`
  margin-top: 8px;
  margin-bottom: 16px;
  white-space: nowrap;
  /* overflow: hidden; */

  font-family: -apple-system, BlinkMacSystemFont, segoe ui, roboto, oxygen,
    ubuntu, cantarell, fira sans, droid sans, helvetica neue, sans-serif;
  font-size: 17px;
  font-weight: 400;
  color: #745fb5;
  font-size: calc(19px + 0 * ((100vw - 768px) / 512));
`;

export let LineOnly = styled.div`
  margin-left: 24px;
  content: "";
  display: inline-block;
  vertical-align: middle;
  width: 100%;
  height: 1px;
  background: linear-gradient(
    to right,
    rgba(116, 95, 181, 0.2),
    transparent 80%
  );
`;
export let Line = React.forwardRef(({ style, ...props }, ref) => {
  return <div style={{ ...style, flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center'}} {...props}><LineOnly style={{ flex: 1 }} /></div>
})
