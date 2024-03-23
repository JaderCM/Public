window.App = new Vue({
  el: 'section',
  data: {
    dados: localStorage.dados ? JSON.parse(localStorage.dados) : {},
    início: null,
    sensores: {
      gps: {
        atualizando: false,
        coordenadas: null,
        observador: null
      },
    }
  },
  watch: {
    "sensores.gps.coordenadas": {
      handler: function(coordenadas) {
        this.$set(this.dados, new Date(), coordenadas.json());
        localStorage.dados = JSON.stringify(this.dados);
      },
      deep: true
    }
  },
  computed: {
    coordenadas: function() {
      const horários = Object.keys(this.dados).map(k => ({
        chave: k,
        horário: new Date(k)
      }));
      return horários
        .filter(horário => Math.trunc(horário.horário.getTime() / 1000) >= Math.trunc(this.início.getTime() / 1000))
        .map(horário => ({
          ...this.dados[horário.chave],
          horário: horário.horário
        }))
        .sort((dado1, dado2) => dado2.horário.getTime() - dado1.horário.getTime());
    }
  },
  methods: {
    atualizarGPS: async function() {
      if (this.sensores.gps.atualizando)
        return this.sensores.gps.atualizando;
      this.sensores.gps.atualizando = new Promise(async (atualizado, erroAoAtualizar) => {
        try {
          if (this.sensores.gps.observador)
            navigator.geolocation.clearWatch(this.sensores.gps.observador);
          this.sensores.gps.observador = navigator.geolocation.watchPosition(gps => {
            this.$set(this.sensores.gps, "coordenadas", gps.coords);
            atualizado(gps.coords);
          }, erro => {
            switch (erro.code) {
              case erro.PERMISSION_DENIED:
                reject(new Error("Permissão negada para obter dados do GPS."));
                break;
              case erro.POSITION_UNAVAILABLE:
                reject(new Error("GPS indisponível."));
                break;
              case erro.TIMEOUT:
                reject(new Error("Tempo expirou ao obter dados do GPS."));
                break;
              case erro.UNKNOWN_ERROR:
                reject(new Error("Ocorreu um erro não esperado."));
                break;
            }
          }, {enableHighAccuracy: true});
        }
        catch (erroDuranteAtualização) {
          erroAoAtualizar(erroDuranteAtualização);
        }
      });
      try {
        return await this.sensores.gps.atualizando;
      }
      finally {
        this.sensores.gps.atualizando = false;
      }
    },
    iniciar: function() {
      this.início = new Date();
      this.atualizarGPS();
    }
  }
});
GeolocationCoordinates.prototype.json = function() {
  return {
    ...this,
    latitude: this.latitude,
    longitude: this.longitude,
    altitude: this.altitude,
    accuracy: this.accuracy,
    altitudeAccuracy: this.altitudeAccuracy,
    heading: this.heading,
    speed: this.speed
  };
};