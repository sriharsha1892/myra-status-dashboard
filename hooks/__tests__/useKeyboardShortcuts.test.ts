import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts, useEscapeKey, getShortcutDisplay } from '../useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let eventListeners: { [key: string]: EventListener } = {};

  beforeEach(() => {
    eventListeners = {};

    // Mock addEventListener
    window.addEventListener = jest.fn((event: string, handler: EventListener) => {
      eventListeners[event] = handler;
    });

    // Mock removeEventListener
    window.removeEventListener = jest.fn((event: string) => {
      delete eventListeners[event];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should register keyboard event listener on mount', () => {
      const callback = jest.fn();
      const shortcuts = [{ key: 'a', callback }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should remove keyboard event listener on unmount', () => {
      const callback = jest.fn();
      const shortcuts = [{ key: 'a', callback }];

      const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts));
      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should call callback when matching key is pressed', () => {
      const callback = jest.fn();
      const shortcuts = [{ key: 'a', callback }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 'a' });
      act(() => {
        eventListeners['keydown'](event);
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(event);
    });

    it('should not call callback when non-matching key is pressed', () => {
      const callback = jest.fn();
      const shortcuts = [{ key: 'a', callback }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 'b' });
      act(() => {
        eventListeners['keydown'](event);
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive key matching', () => {
      const callback = jest.fn();
      const shortcuts = [{ key: 'A', callback }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 'a' });
      act(() => {
        eventListeners['keydown'](event);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Modifier Keys', () => {
    it('should call callback when Ctrl+key is pressed', () => {
      const callback = jest.fn();
      const shortcuts = [{ key: 'k', ctrlKey: true, callback }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
      act(() => {
        eventListeners['keydown'](event);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not call callback when Ctrl is not pressed but required', () => {
      const callback = jest.fn();
      const shortcuts = [{ key: 'k', ctrlKey: true, callback }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: false });
      act(() => {
        eventListeners['keydown'](event);
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('should call callback when Cmd+key is pressed (metaKey)', () => {
      const callback = jest.fn();
      const shortcuts = [{ key: 'k', metaKey: true, callback }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
      act(() => {
        eventListeners['keydown'](event);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should call callback when Shift+key is pressed', () => {
      const callback = jest.fn();
      const shortcuts = [{ key: 'K', shiftKey: true, callback }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 'K', shiftKey: true });
      act(() => {
        eventListeners['keydown'](event);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should call callback when Alt+key is pressed', () => {
      const callback = jest.fn();
      const shortcuts = [{ key: 'a', altKey: true, callback }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 'a', altKey: true });
      act(() => {
        eventListeners['keydown'](event);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple modifier keys', () => {
      const callback = jest.fn();
      const shortcuts = [{ key: 'k', ctrlKey: true, shiftKey: true, callback }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        shiftKey: true
      });
      act(() => {
        eventListeners['keydown'](event);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not call callback when modifier key mismatch', () => {
      const callback = jest.fn();
      const shortcuts = [{ key: 'k', ctrlKey: true, shiftKey: true, callback }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      // Missing shiftKey
      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
      act(() => {
        eventListeners['keydown'](event);
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Shortcuts', () => {
    it('should handle multiple shortcuts', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const shortcuts = [
        { key: 'a', callback: callback1 },
        { key: 'b', callback: callback2 },
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event1 = new KeyboardEvent('keydown', { key: 'a' });
      act(() => {
        eventListeners['keydown'](event1);
      });

      const event2 = new KeyboardEvent('keydown', { key: 'b' });
      act(() => {
        eventListeners['keydown'](event2);
      });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should stop after first matching shortcut', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const shortcuts = [
        { key: 'a', callback: callback1 },
        { key: 'a', callback: callback2 }, // Duplicate key
      ];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 'a' });
      act(() => {
        eventListeners['keydown'](event);
      });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('Event Prevention', () => {
    it('should prevent default when shortcut matches', () => {
      const callback = jest.fn();
      const shortcuts = [{ key: 'k', ctrlKey: true, callback }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      act(() => {
        eventListeners['keydown'](event);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not prevent default when no shortcut matches', () => {
      const callback = jest.fn();
      const shortcuts = [{ key: 'a', callback }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 'b' });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      act(() => {
        eventListeners['keydown'](event);
      });

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  describe('Enabled/Disabled State', () => {
    it('should not register listener when disabled', () => {
      const callback = jest.fn();
      const shortcuts = [{ key: 'a', callback }];

      renderHook(() => useKeyboardShortcuts(shortcuts, false));

      expect(window.addEventListener).not.toHaveBeenCalled();
    });

    it('should call callback when enabled', () => {
      const callback = jest.fn();
      const shortcuts = [{ key: 'a', callback }];

      renderHook(() => useKeyboardShortcuts(shortcuts, true));

      const event = new KeyboardEvent('keydown', { key: 'a' });
      act(() => {
        eventListeners['keydown'](event);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle dynamic enable/disable', () => {
      const callback = jest.fn();
      const shortcuts = [{ key: 'a', callback }];

      const { rerender } = renderHook(
        ({ enabled }) => useKeyboardShortcuts(shortcuts, enabled),
        { initialProps: { enabled: true } }
      );

      // Initially enabled
      expect(window.addEventListener).toHaveBeenCalled();

      // Disable - this triggers effect cleanup and re-run
      jest.clearAllMocks(); // Clear previous calls
      rerender({ enabled: false });

      // When disabled, no listener should be added
      expect(window.addEventListener).not.toHaveBeenCalled();
    });
  });

  describe('Special Keys', () => {
    it('should handle Escape key', () => {
      const callback = jest.fn();
      const shortcuts = [{ key: 'Escape', callback }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      act(() => {
        eventListeners['keydown'](event);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle Enter key', () => {
      const callback = jest.fn();
      const shortcuts = [{ key: 'Enter', callback }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      act(() => {
        eventListeners['keydown'](event);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle arrow keys', () => {
      const callback = jest.fn();
      const shortcuts = [{ key: 'ArrowUp', callback }];

      renderHook(() => useKeyboardShortcuts(shortcuts));

      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      act(() => {
        eventListeners['keydown'](event);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});

describe('useEscapeKey', () => {
  let eventListeners: { [key: string]: EventListener } = {};

  beforeEach(() => {
    eventListeners = {};
    window.addEventListener = jest.fn((event: string, handler: EventListener) => {
      eventListeners[event] = handler;
    });
    window.removeEventListener = jest.fn((event: string) => {
      delete eventListeners[event];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call callback when Escape is pressed', () => {
    const callback = jest.fn();

    renderHook(() => useEscapeKey(callback));

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    act(() => {
      eventListeners['keydown'](event);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not call callback when other keys are pressed', () => {
    const callback = jest.fn();

    renderHook(() => useEscapeKey(callback));

    const event = new KeyboardEvent('keydown', { key: 'a' });
    act(() => {
      eventListeners['keydown'](event);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should respect enabled flag', () => {
    const callback = jest.fn();

    renderHook(() => useEscapeKey(callback, false));

    expect(window.addEventListener).not.toHaveBeenCalled();
  });

  it('should work when enabled', () => {
    const callback = jest.fn();

    renderHook(() => useEscapeKey(callback, true));

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    act(() => {
      eventListeners['keydown'](event);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe('getShortcutDisplay', () => {
  it('should display simple key', () => {
    const shortcut = { key: 'a', callback: jest.fn() };
    expect(getShortcutDisplay(shortcut)).toBe('A');
  });

  it('should display Ctrl+key', () => {
    const shortcut = { key: 'k', ctrlKey: true, callback: jest.fn() };
    expect(getShortcutDisplay(shortcut)).toBe('Ctrl + K');
  });

  it('should display Cmd+key (metaKey)', () => {
    const shortcut = { key: 'k', metaKey: true, callback: jest.fn() };
    expect(getShortcutDisplay(shortcut)).toBe('⌘ + K');
  });

  it('should display Shift+key', () => {
    const shortcut = { key: 'a', shiftKey: true, callback: jest.fn() };
    expect(getShortcutDisplay(shortcut)).toBe('⇧ + A');
  });

  it('should display Alt+key', () => {
    const shortcut = { key: 'a', altKey: true, callback: jest.fn() };
    expect(getShortcutDisplay(shortcut)).toBe('⌥ + A');
  });

  it('should display multiple modifiers', () => {
    const shortcut = {
      key: 'k',
      ctrlKey: true,
      shiftKey: true,
      callback: jest.fn()
    };
    expect(getShortcutDisplay(shortcut)).toBe('Ctrl + ⇧ + K');
  });

  it('should display all modifiers', () => {
    const shortcut = {
      key: 'k',
      ctrlKey: true,
      metaKey: true,
      shiftKey: true,
      altKey: true,
      callback: jest.fn()
    };
    expect(getShortcutDisplay(shortcut)).toBe('Ctrl + ⌘ + ⇧ + ⌥ + K');
  });

  it('should capitalize key', () => {
    const shortcut = { key: 'escape', callback: jest.fn() };
    expect(getShortcutDisplay(shortcut)).toBe('ESCAPE');
  });
});
