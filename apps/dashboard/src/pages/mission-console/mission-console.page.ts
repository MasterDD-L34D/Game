export const registerMissionConsolePage = (module: any): void => {
  module.component('missionConsolePage', {
    template: `
      <mission-dashboard></mission-dashboard>
    `,
  });
};
