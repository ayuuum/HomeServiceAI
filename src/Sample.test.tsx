import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const SampleComponent = () => <div>Hello Test</div>;

describe('Sample Test', () => {
    it('should render the component', () => {
        render(<SampleComponent />);
        expect(screen.getByText('Hello Test')).toBeInTheDocument();
    });
});
