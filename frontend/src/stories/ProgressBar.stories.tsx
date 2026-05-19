import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ProgressBar } from '../components/ProgressBar';

const meta: Meta<typeof ProgressBar> = {
  title: 'Components/ProgressBar',
  component: ProgressBar,
  tags: ['autodocs'],
  argTypes: {
    currentStep: {
      control: 'select',
      options: ['checkout', 'quotation', 'contract', 'processing', 'dashboard'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof ProgressBar>;

export const ProductStep: Story = {
  args: {
    currentStep: 'checkout',
  },
};

export const PlanStep: Story = {
  args: {
    currentStep: 'quotation',
  },
};

export const DetailsStep: Story = {
  args: {
    currentStep: 'contract',
  },
};

export const ProcessingStep: Story = {
  args: {
    currentStep: 'processing',
  },
};

export const DashboardStep: Story = {
  args: {
    currentStep: 'dashboard',
  },
};
