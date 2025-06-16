import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { Heart, Download, ArrowRight, Plus } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile button component with multiple variants, sizes, and states. Built with Radix UI primitives and enhanced with motion animations.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      description: 'The visual style variant of the button'
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'xl', 'icon'],
      description: 'The size of the button'
    },
    loading: {
      control: 'boolean',
      description: 'Shows loading spinner and disables button'
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the button'
    },
    fullWidth: {
      control: 'boolean',
      description: 'Makes button take full width of container'
    },
    asChild: {
      control: 'boolean',
      description: 'Renders button as child element (useful for links)'
    }
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic variants
export const Default: Story = {
  args: {
    children: 'Button',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Button',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Button',
  },
};

export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Button',
  },
};

// Sizes
export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large',
  },
};

export const ExtraLarge: Story = {
  args: {
    size: 'xl',
    children: 'Extra Large',
  },
};

export const Icon: Story = {
  args: {
    size: 'icon',
    children: <Heart className="h-4 w-4" />,
  },
};

// States
export const Loading: Story = {
  args: {
    loading: true,
    children: 'Button',
  },
};

export const LoadingWithText: Story = {
  args: {
    loading: true,
    loadingText: 'Saving...',
    children: 'Save',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
};

// With icons
export const WithLeftIcon: Story = {
  args: {
    leftIcon: <Download className="h-4 w-4" />,
    children: 'Download',
  },
};

export const WithRightIcon: Story = {
  args: {
    rightIcon: <ArrowRight className="h-4 w-4" />,
    children: 'Next',
  },
};

export const WithBothIcons: Story = {
  args: {
    leftIcon: <Plus className="h-4 w-4" />,
    rightIcon: <ArrowRight className="h-4 w-4" />,
    children: 'Add Item',
  },
};

// Layout
export const FullWidth: Story = {
  args: {
    fullWidth: true,
    children: 'Full Width Button',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '300px' }}>
        <Story />
      </div>
    ),
  ],
};

// Interactive examples
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available button variants displayed together.'
      }
    }
  }
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
      <Button size="icon">
        <Heart className="h-4 w-4" />
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available button sizes displayed together.'
      }
    }
  }
};

export const CustomMotion: Story = {
  args: {
    children: 'Hover me!',
    whileHover: { scale: 1.1, rotate: 2 },
    whileTap: { scale: 0.9 },
    transition: { duration: 0.3 },
  },
  parameters: {
    docs: {
      description: {
        story: 'Button with custom motion animations on hover and tap.'
      }
    }
  }
};

// Platform-specific examples
export const AsLink: Story = {
  args: {
    asChild: true,
    children: (
      <a href="#" onClick={(e) => e.preventDefault()}>
        I'm actually a link
      </a>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Button rendered as a link element using the asChild prop. This is useful for navigation buttons.'
      }
    }
  }
};

// Accessibility example
export const Accessible: Story = {
  args: {
    children: 'Accessible Button',
    'aria-label': 'This button performs an important action',
    'aria-describedby': 'button-description',
  },
  render: (args) => (
    <div>
      <Button {...args} />
      <p id="button-description" className="mt-2 text-sm text-gray-600">
        This button demonstrates proper accessibility attributes.
      </p>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Button with proper accessibility attributes for screen readers.'
      }
    }
  }
};
