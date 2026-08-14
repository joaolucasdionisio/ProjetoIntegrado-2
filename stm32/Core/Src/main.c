/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file           : main.c
  * @brief          : Main program body
  ******************************************************************************
  */
/* USER CODE END Header */

/* Includes ------------------------------------------------------------------*/
#include "main.h"
#include "usb_device.h"

/* Private includes ----------------------------------------------------------*/
/* USER CODE BEGIN Includes */
#include "usbd_cdc_if.h"
/* USER CODE END Includes */

/* Private typedef -----------------------------------------------------------*/
/* USER CODE BEGIN PTD */

/* USER CODE END PTD */

/* Private define ------------------------------------------------------------*/
/* USER CODE BEGIN PD */

#define ADC_CANAL_POTENCIOMETRO hadc1

#define FILTRO_GPIO_PORT        GPIOA
#define FILTRO_GPIO_PIN         GPIO_PIN_10

#define ADC_RESOLUCAO_MAX       4095.0f
#define LUX_ESCALA_MAX          1000.0f

#define TAMANHO_FILTRO_MEDIA    5
#define DELAY_AMOSTRAGEM_MS     500

/* Protocolo serial */
#define INICIO_PACOTE           0xAA
#define FIM_PACOTE              0x55
#define TAMANHO_PACOTE          5

/* USER CODE END PD */

/* Private macro -------------------------------------------------------------*/
/* USER CODE BEGIN PM */

/* USER CODE END PM */

/* Private variables ---------------------------------------------------------*/
ADC_HandleTypeDef hadc1;

/* USER CODE BEGIN PV */

/* USER CODE END PV */

/* Private function prototypes -----------------------------------------------*/
void SystemClock_Config(void);
static void MX_GPIO_Init(void);
static void MX_ADC1_Init(void);

/* USER CODE BEGIN PFP */
float AplicarFiltroLuminosidade(float nova_leitura);
void EnviarLuminosidade(float luminosidade, uint8_t filtro_ativo);
/* USER CODE END PFP */

/* Private user code ---------------------------------------------------------*/
/* USER CODE BEGIN 0 */

/* USER CODE END 0 */

int main(void)
{
  HAL_Init();

  SystemClock_Config();

  MX_GPIO_Init();
  MX_ADC1_Init();
  MX_USB_DEVICE_Init();

  /* USER CODE BEGIN WHILE */
  while (1)
  {
      HAL_ADC_Start(&ADC_CANAL_POTENCIOMETRO);

      if (HAL_ADC_PollForConversion(
              &ADC_CANAL_POTENCIOMETRO,
              10) == HAL_OK)
      {
          uint16_t adc_bruto =
              HAL_ADC_GetValue(&ADC_CANAL_POTENCIOMETRO);

          float lux_bruto =
              ((float)adc_bruto / ADC_RESOLUCAO_MAX)
              * LUX_ESCALA_MAX;

          float lux_final = lux_bruto;

          uint8_t filtro_ativo = 0;

          if (HAL_GPIO_ReadPin(
                  FILTRO_GPIO_PORT,
                  FILTRO_GPIO_PIN) == GPIO_PIN_SET)
          {
              filtro_ativo = 1;

              lux_final =
                  AplicarFiltroLuminosidade(lux_bruto);
          }

          /*
           * Envia pacote binário:
           *
           * [0] 0xAA
           * [1] byte alto da luminosidade
           * [2] byte baixo da luminosidade
           * [3] estado do filtro
           * [4] 0x55
           */
          EnviarLuminosidade(
              lux_final,
              filtro_ativo
          );
      }

      HAL_ADC_Stop(&ADC_CANAL_POTENCIOMETRO);

      HAL_Delay(DELAY_AMOSTRAGEM_MS);

    /* USER CODE END WHILE */

    /* USER CODE BEGIN 3 */
  }
  /* USER CODE END 3 */
}


void SystemClock_Config(void)
{
  RCC_OscInitTypeDef RCC_OscInitStruct = {0};
  RCC_ClkInitTypeDef RCC_ClkInitStruct = {0};
  RCC_PeriphCLKInitTypeDef PeriphClkInit = {0};

  RCC_OscInitStruct.OscillatorType =
      RCC_OSCILLATORTYPE_HSE;

  RCC_OscInitStruct.HSEState =
      RCC_HSE_ON;

  RCC_OscInitStruct.HSEPredivValue =
      RCC_HSE_PREDIV_DIV1;

  RCC_OscInitStruct.HSIState =
      RCC_HSI_ON;

  RCC_OscInitStruct.PLL.PLLState =
      RCC_PLL_ON;

  RCC_OscInitStruct.PLL.PLLSource =
      RCC_PLLSOURCE_HSE;

  RCC_OscInitStruct.PLL.PLLMUL =
      RCC_PLL_MUL6;

  if (HAL_RCC_OscConfig(&RCC_OscInitStruct) != HAL_OK)
  {
      Error_Handler();
  }

  RCC_ClkInitStruct.ClockType =
      RCC_CLOCKTYPE_HCLK |
      RCC_CLOCKTYPE_SYSCLK |
      RCC_CLOCKTYPE_PCLK1 |
      RCC_CLOCKTYPE_PCLK2;

  RCC_ClkInitStruct.SYSCLKSource =
      RCC_SYSCLKSOURCE_PLLCLK;

  RCC_ClkInitStruct.AHBCLKDivider =
      RCC_SYSCLK_DIV1;

  RCC_ClkInitStruct.APB1CLKDivider =
      RCC_HCLK_DIV2;

  RCC_ClkInitStruct.APB2CLKDivider =
      RCC_HCLK_DIV1;

  if (HAL_RCC_ClockConfig(
          &RCC_ClkInitStruct,
          FLASH_LATENCY_1) != HAL_OK)
  {
      Error_Handler();
  }

  PeriphClkInit.PeriphClockSelection =
      RCC_PERIPHCLK_ADC |
      RCC_PERIPHCLK_USB;

  PeriphClkInit.AdcClockSelection =
      RCC_ADCPCLK2_DIV4;

  PeriphClkInit.UsbClockSelection =
      RCC_USBCLKSOURCE_PLL;

  if (HAL_RCCEx_PeriphCLKConfig(
          &PeriphClkInit) != HAL_OK)
  {
      Error_Handler();
  }
}


static void MX_ADC1_Init(void)
{
  ADC_ChannelConfTypeDef sConfig = {0};

  hadc1.Instance = ADC1;

  hadc1.Init.ScanConvMode =
      ADC_SCAN_DISABLE;

  hadc1.Init.ContinuousConvMode =
      DISABLE;

  hadc1.Init.DiscontinuousConvMode =
      DISABLE;

  hadc1.Init.ExternalTrigConv =
      ADC_SOFTWARE_START;

  hadc1.Init.DataAlign =
      ADC_DATAALIGN_RIGHT;

  hadc1.Init.NbrOfConversion = 1;

  if (HAL_ADC_Init(&hadc1) != HAL_OK)
  {
      Error_Handler();
  }

  sConfig.Channel =
      ADC_CHANNEL_0;

  sConfig.Rank =
      ADC_REGULAR_RANK_1;

  sConfig.SamplingTime =
      ADC_SAMPLETIME_1CYCLE_5;

  if (HAL_ADC_ConfigChannel(
          &hadc1,
          &sConfig) != HAL_OK)
  {
      Error_Handler();
  }
}


static void MX_GPIO_Init(void)
{
  GPIO_InitTypeDef GPIO_InitStruct = {0};

  __HAL_RCC_GPIOD_CLK_ENABLE();
  __HAL_RCC_GPIOA_CLK_ENABLE();

  GPIO_InitStruct.Pin =
      GPIO_PIN_10;

  GPIO_InitStruct.Mode =
      GPIO_MODE_INPUT;

  GPIO_InitStruct.Pull =
      GPIO_PULLDOWN;

  HAL_GPIO_Init(
      GPIOA,
      &GPIO_InitStruct
  );
}


/* USER CODE BEGIN 4 */

float AplicarFiltroLuminosidade(float nova_leitura)
{
    static float historico[TAMANHO_FILTRO_MEDIA] =
        {0.0f};

    static uint8_t indice = 0;

    float soma = 0.0f;

    historico[indice] =
        nova_leitura;

    indice =
        (indice + 1)
        % TAMANHO_FILTRO_MEDIA;

    for (uint8_t i = 0;
         i < TAMANHO_FILTRO_MEDIA;
         i++)
    {
        soma += historico[i];
    }

    return soma /
        (float)TAMANHO_FILTRO_MEDIA;
}


void EnviarLuminosidade(
    float luminosidade,
    uint8_t filtro_ativo)
{
    /*
     * Multiplica por 10 para preservar
     * uma casa decimal.
     *
     * 523.4 lux -> 5234
     */
    uint16_t valor =
        (uint16_t)(luminosidade * 10.0f);

    uint8_t pacote[TAMANHO_PACOTE];

    pacote[0] = INICIO_PACOTE;

    /*
     * Byte mais significativo.
     */
    pacote[1] =
        (uint8_t)((valor >> 8) & 0xFF);

    /*
     * Byte menos significativo.
     */
    pacote[2] =
        (uint8_t)(valor & 0xFF);

    /*
     * 0x00 = filtro desligado
     * 0x01 = filtro ligado
     */
    pacote[3] =
        filtro_ativo ? 0x01 : 0x00;

    pacote[4] =
        FIM_PACOTE;

    CDC_Transmit_FS(
        pacote,
        TAMANHO_PACOTE
    );
}

/* USER CODE END 4 */


void Error_Handler(void)
{
  __disable_irq();

  while (1)
  {
  }
}


#ifdef USE_FULL_ASSERT

void assert_failed(
    uint8_t *file,
    uint32_t line)
{
}

#endif
