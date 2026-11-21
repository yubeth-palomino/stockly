import { describe, expect, it } from 'vitest';
import { plantillaInvitacion } from './plantillasCorreo';

describe('plantilla de invitación', () => {
  it('escapa el nombre y el enlace antes de insertarlos en el HTML', () => {
    const html = plantillaInvitacion(
      '<Ana & Luis>',
      'https://stockly.example/auth/confirm?token=a&next="home"',
    );

    expect(html).toContain('Hola &lt;Ana &amp; Luis&gt;');
    expect(html).toContain('token=a&amp;next=&quot;home&quot;');
    expect(html).not.toContain('<Ana');
  });
});
