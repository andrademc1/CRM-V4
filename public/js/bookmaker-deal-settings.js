
// Manipulação das configurações de deal do bookmaker
document.addEventListener('DOMContentLoaded', function() {
  // Elementos DOM
  const dealTypeSelect = document.getElementById('dealType');
  const singleDealContainer = document.getElementById('singleDealContainer');
  const multiDealContainer = document.getElementById('multiDealContainer');
  const defaultDealCheckbox = document.getElementById('defaultDeal');
  const dealGeographiesContainer = document.getElementById('dealGeographiesContainer');
  const configurarDealBtn = document.getElementById('configurarDealBtn');
  
  // Elementos de valores de deal
  const singleAmount = document.getElementById('singleAmount');
  const singleCurrency = document.getElementById('singleCurrency');
  
  // Controla a visibilidade das seções com base no tipo de deal
  if (dealTypeSelect) {
    dealTypeSelect.addEventListener('change', function() {
      const selectedType = this.value;
      
      if (selectedType === 'single') {
        singleDealContainer.style.display = 'block';
        multiDealContainer.style.display = 'none';
      } else if (selectedType === 'multi') {
        singleDealContainer.style.display = 'none';
        multiDealContainer.style.display = 'block';
      } else {
        singleDealContainer.style.display = 'none';
        multiDealContainer.style.display = 'none';
      }
    });
  }
  
  // Carregar deals existentes do bookmaker
  function loadExistingDeals(bookmakerId) {
    if (!bookmakerId) return;
    
    fetch(`/bookmakers/get-deals/${bookmakerId}`)
      .then(response => response.json())
      .then(data => {
        if (data.success && data.deals && data.deals.length > 0) {
          const deal = data.deals[0]; // Pega o primeiro deal
          
          // Preencher o formulário com os dados existentes
          if (dealTypeSelect) dealTypeSelect.value = deal.deal_type;
          if (defaultDealCheckbox) defaultDealCheckbox.checked = deal.default_deal;
          
          // Disparar o evento change para mostrar os campos corretos
          if (dealTypeSelect) {
            const event = new Event('change');
            dealTypeSelect.dispatchEvent(event);
          }
          
          // Preencher valores específicos do tipo de deal
          const dealValues = typeof deal.deal_values === 'string' ? 
                            JSON.parse(deal.deal_values) : deal.deal_values;
          
          if (deal.deal_type === 'single' && dealValues) {
            if (singleAmount) singleAmount.value = dealValues.amount || '';
            if (singleCurrency) singleCurrency.value = dealValues.currency || '';
          } else if (deal.deal_type === 'multi' && dealValues) {
            // Preencher campos para multi deals (implementar conforme necessário)
          }
          
          // Implementar preenchimento das geografias se existirem
          // ...
        }
      })
      .catch(error => {
        console.error('Erro ao carregar deals existentes:', error);
      });
  }
  
  // Configurar evento para salvar deal
  if (configurarDealBtn) {
    configurarDealBtn.addEventListener('click', function() {
      const bookmakerId = document.getElementById('bookmaker_id')?.value;
      
      if (!bookmakerId) {
        alert('ID do bookmaker não encontrado!');
        return;
      }
      
      // Obter tipo de deal
      const dealType = dealTypeSelect ? dealTypeSelect.value : 'single';
      
      // Preparar valores de acordo com o tipo de deal
      let dealValues = {};
      
      if (dealType === 'single') {
        dealValues = {
          amount: singleAmount ? singleAmount.value : '',
          currency: singleCurrency ? singleCurrency.value : ''
        };
      } else if (dealType === 'multi') {
        // Lógica para multi deals (implementar conforme necessário)
        dealValues = {
          // Valores específicos para multi deals
        };
      }
      
      // Obter valor do checkbox default deal
      const defaultDeal = defaultDealCheckbox ? defaultDealCheckbox.checked : false;
      
      // Obter geografias selecionadas (implementar conforme sua UI)
      const geographies = []; // Array de geografias selecionadas
      
      // Preparar dados para envio
      const dealData = {
        bookmaker_id: bookmakerId,
        deal_type: dealType,
        deal_values: dealValues,
        default_deal: defaultDeal,
        geographies: geographies
      };
      
      // Enviar dados para o servidor
      fetch('/bookmakers/salvar-deal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dealData)
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert('Configurações de deal salvas com sucesso!');
          // Opcional: redirecionar ou recarregar dados
        } else {
          alert('Erro ao salvar configurações: ' + (data.error || 'Erro desconhecido'));
        }
      })
      .catch(error => {
        console.error('Erro ao salvar configurações de deal:', error);
        alert('Erro ao salvar configurações: ' + error.message);
      });
    });
  }
  
  // Inicializar - carregar deals existentes se estiver na página de edição
  const bookmakerId = document.getElementById('bookmaker_id')?.value;
  if (bookmakerId) {
    loadExistingDeals(bookmakerId);
  }
});
