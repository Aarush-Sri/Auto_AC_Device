import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThermostatProvider } from '../context/ThermostatContext';
import Header from '../components/Header';

describe('Header Component', () => {
  it('renders brand name and logo without extra top-left details', () => {
    render(
      <ThermostatProvider>
        <Header onOpenSettings={() => {}} />
      </ThermostatProvider>
    );

    // Name & Logo present
    expect(screen.getByText('Aura Climate')).toBeInTheDocument();
    expect(screen.getByAltText('Aura Climate Logo')).toBeInTheDocument();

    // Extra details absent from top-left
    expect(screen.queryByText('Precision Ambient')).not.toBeInTheDocument();
    expect(screen.queryByText('Penthouse Suite')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});
