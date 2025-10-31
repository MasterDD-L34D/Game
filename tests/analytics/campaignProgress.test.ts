import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import CampaignProgress from '../../analytics/dashboards/campaignProgress.vue';

describe('CampaignProgress dashboard', () => {
  it('renderizza layout funnel e heatmap coerente', () => {
    const wrapper = mount(CampaignProgress, {
      props: {
        summary: {
          activeCampaigns: 3,
          totalLeads: 12840,
          conversionRate: 0.247,
          targetConversionRate: 0.228,
          lastUpdated: '2024-10-05T10:30:00Z',
        },
        funnel: [
          { id: 'awareness', label: 'Awareness', leads: 12840, conversions: 6840, delta: 0.08 },
          { id: 'consideration', label: 'Considerazione', leads: 6840, conversions: 3520, delta: 0.04 },
          { id: 'evaluation', label: 'Valutazione', leads: 3520, conversions: 1860, delta: 0.02 },
          { id: 'activation', label: 'Attivazione', leads: 1860, conversions: 980, delta: -0.01 },
          { id: 'retention', label: 'Fidelizzazione', leads: 980, conversions: 610, delta: 0.03 },
        ],
        heatmap: {
          periods: ['Settimana 1', 'Settimana 2', 'Settimana 3', 'Settimana 4'],
          channels: ['Email', 'Social', 'In-Game', 'LiveOps'],
          values: [
            [0.41, 0.46, 0.51, 0.58],
            [0.38, 0.44, 0.48, 0.55],
            [0.52, 0.57, 0.61, 0.68],
            [0.33, 0.39, 0.44, 0.49],
          ],
          leads: [
            [520, 610, 690, 810],
            [480, 560, 640, 720],
            [690, 740, 810, 920],
            [320, 380, 450, 500],
          ],
        },
        highlights: [
          {
            id: 'campaign-alpha:awareness',
            title: 'Campaign Alpha',
            description: 'Stage awareness — period Settimana 4',
            owner: 'Email',
            eta: 'Sprint 42',
            momentum: 0.12,
          },
          {
            id: 'campaign-beta:evaluation',
            title: 'Campaign Beta',
            description: 'Stage evaluation — period Settimana 3',
            owner: 'In-Game',
            eta: 'Sprint 43',
            momentum: 0.06,
          },
          {
            id: 'campaign-gamma:activation',
            title: 'Campaign Gamma',
            description: 'Stage activation — period Settimana 2',
            owner: 'LiveOps',
            momentum: -0.03,
          },
        ],
      },
    });

    expect(wrapper.html()).toMatchSnapshot();
  });
});
