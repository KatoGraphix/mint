// South African Banks list with logos and codes
export const SOUTH_AFRICAN_BANKS = [
  {
    id: "absa",
    name: "ABSA Bank",
    code: "632005",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Absa_logo.svg/1200px-Absa_logo.svg.png",
  },
  {
    id: "fnb",
    name: "First National Bank (FNB)",
    code: "250100",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/FNB_logo.png/1200px-FNB_logo.png",
  },
  {
    id: "nedbank",
    name: "Nedbank",
    code: "198765",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Nedbank_logo.svg/1200px-Nedbank_logo.svg.png",
  },
  {
    id: "standard",
    name: "Standard Bank",
    code: "051001",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/StandardBank_logo.svg/1200px-StandardBank_logo.svg.png",
  },
  {
    id: "capitec",
    name: "Capitec Bank",
    code: "470010",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Capitec_logo.svg/1200px-Capitec_logo.svg.png",
  },
  {
    id: "bidvest",
    name: "Bidvest Bank",
    code: "462005",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Bidvest_logo.svg/1200px-Bidvest_logo.svg.png",
  },
  {
    id: "tyme",
    name: "TYME Bank",
    code: "679001",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/TYME_Bank_logo.svg/1200px-TYME_Bank_logo.svg.png",
  },
  {
    id: "african",
    name: "African Bank",
    code: "510891",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/African_Bank_logo.svg/1200px-African_Bank_logo.svg.png",
  },
  {
    id: "investec",
    name: "Investec Bank",
    code: "580105",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Investec_logo.svg/1200px-Investec_logo.svg.png",
  },
  {
    id: "discovery",
    name: "Discovery Bank",
    code: "679002",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Discovery_logo.svg/1200px-Discovery_logo.svg.png",
  },
];

export const getBankById = (bankId) => {
  return SOUTH_AFRICAN_BANKS.find((bank) => bank.id === bankId);
};

export const getBankByName = (bankName) => {
  return SOUTH_AFRICAN_BANKS.find((bank) => bank.name.toLowerCase() === bankName.toLowerCase());
};