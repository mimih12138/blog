---
title: "IMU 九轴姿态解算工程分析"
date: 2026-05-30
tags:
  - IMU
  - STM32
  - 姿态解算
  - 卡尔曼滤波
description: 基于 STM32G431 的九轴 IMU 传感器固件分析，包含 Mahony 互补滤波、传感器驱动、Shell 交互系统。
---

# IMU_9_DSX 九轴姿态解算工程 深度分析总结

> 分析日期: 2026-05-30  
> 工程来源: https://github.com/EggplantPotatoes/imu_9_DSF  
> 主控芯片: STM32G431RBT6  
> 传感器: LSM6DS3TR (六轴加速度+陀螺仪) + LIS2MDLTR (三轴磁力计)  
> 姿态算法: 四元数 Mahony 互补滤波 + 卡尔曼滤波偏航角融合

---

## 一、工程概述

IMU_9_DSX 是一款基于 STM32G431RBT6 的九轴 IMU 姿态传感器工程。它集成了三轴加速度计、三轴陀螺仪（LSM6DS3TR）和三轴磁力计（LIS2MDLTR），通过四元数 Mahony 互补滤波算法进行九轴数据融合，实时解算出欧拉角（Roll/Pitch/Yaw）、四元数、旋转矩阵、世界坐标系下的加速度/磁场等数据，通过 USB CDC 虚拟串口输出供上位机（VOFA+）可视化调试。

### 核心特性

| 特性 | 数值/方案 |
|------|-----------|
| 主控 | STM32G431RBT6 @ 170MHz (Cortex-M4F) |
| 传感器 | LSM6DS3TR (I2C3, 0xD4) + LIS2MDLTR (I2C1, 0x3C) |
| 加速度量程 | ±2g, ODR 1660Hz |
| 陀螺仪量程 | ±500dps, ODR 1660Hz |
| 磁力计ODR | 100Hz, 连续模式 |
| 解算频率 | 1000Hz (TIM2 1ms中断) |
| 姿态算法 | 四元数 Mahony 互补滤波 (加速度+陀螺仪+磁力计) |
| 偏航融合 | 一维卡尔曼滤波 (陀螺仪Z轴+磁力计偏航) |
| 数学库 | 自实现快速数学函数 (fast_sqrt, my_sin, my_cos, arctan2) |
| 数据输出 | USB CDC (VCP) → VOFA+ FireWater协议 |
| 命令行接口 | USART1 Shell (2Mbps) 支持校准/配置 |
| 校准存储 | STM32内部Flash扇区 (0x0801F800, 2KB) |

---

## 二、硬件平台

### 2.1 MCU: STM32G431RBT6

- **内核**: ARM Cortex-M4F @ 170MHz (带FPU)
- **封装**: LQFP64
- **Flash**: 128KB (用户Flash区: 0x0801F800, 2KB用于校准参数)
- **晶振**: HSE 24MHz → PLL ×85 / DIV6 = 340MHz VCO → DIV2 = 170MHz SYSCLK
- **HSI48**: 48MHz 专供USB时钟

### 2.2 外设引脚分配

| 外设 | 引脚 | 功能 |
|------|------|------|
| I2C1_SCL | PA15 | 磁力计 LIS2MDL 时钟线 |
| I2C1_SDA | PB7 | 磁力计 LIS2MDL 数据线 |
| I2C3_SCL | PA8 | 六轴 LSM6DS3 时钟线 |
| I2C3_SDA | PC9 | 六轴 LSM6DS3 数据线 |
| USART1_TX | PA9 | Shell控制台 TX (2Mbps) |
| USART1_RX | PA10 | Shell控制台 RX |
| USB_DM | PA11 | USB CDC 虚拟串口 |
| USB_DP | PA12 | USB CDC 虚拟串口 |
| TEST | PA7 | 测试引脚 (示波器测量采样周期) |
| RGB_R | PC0 | RGB灯红色通道 |
| RGB_G | PC1 | RGB灯绿色通道 |
| RGB_B | PC2 | RGB灯蓝色通道 |

### 2.3 传感器参数

**LSM6DS3TR (六轴加速度+陀螺仪)**:
- I2C地址: 0xD4 (8-bit), 接在 I2C3 总线上
- 加速度配置: ±2g量程, ODR=1660Hz, BW=400Hz, LPF2使能
- 陀螺仪配置: ±500dps量程, ODR=1660Hz
- CTRL3_C: 0x44 (BDU使能, 自动增量读取)
- I2C3速度: Fast Plus (1MHz)

**LIS2MDLTR (三轴磁力计)**:
- I2C地址: 0x3C (8-bit), 接在 I2C1 总线上
- 工作模式: 连续模式, ODR=100Hz
- 温度补偿: 使能
- 偏移抵消: 使能, 低通滤波使能
- BDU: 使能 (数据完整性保护)
- I2C1速度: Fast Plus (1MHz)

---

## 三、软件架构总览

```
┌────────────────────────────────────────────────────────────────┐
│                         main.c                                  │
│  HAL_Init() → SystemClock_Config() → MX_*_Init()               │
│  → user_shell_init() → imu_init() → while(1) { shell_cmd }     │
└──────────────────────────┬─────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼─────┐    ┌──────▼──────┐   ┌──────▼──────┐
    │ TIM2 ISR │    │  Shell线程  │   │  USB CDC     │
    │ 1KHz中断 │    │  USART1 RX  │   │  虚拟串口    │
    └────┬─────┘    └──────┬──────┘   └──────▲──────┘
         │                 │                 │
    ┌────▼─────────────────▼─────────────────┴────┐
    │              imu_9 (IMU集成层)               │
    │  imu_sample_data → imu_final_data_get       │
    │  → data_output_mode (USB发往VOFA+)          │
    └────┬──────────┬──────────┬──────────────────┘
         │          │          │
    ┌────▼──┐ ┌─────▼───┐ ┌───▼────────┐
    │acc_gry│ │magnetic │ │attitude.c  │
    │加速度 │ │磁力计   │ │四元数姿态  │
    │陀螺仪 │ │驱动     │ │Mahony融合  │
    └───┬───┘ └────┬────┘ └──┬─────────┘
        │          │         │
    ┌───▼──────────▼─────────▼────┐
    │       data_filter           │
    │  窗口滤波 + RC低通/高通     │
    └─────────────────────────────┘
    ┌─────────────────────────────┐
    │     kalman_filter           │
    │  陀螺仪+磁力计 偏航角融合   │
    └─────────────────────────────┘
    ┌─────────────────────────────┐
    │       my_math               │
    │  fast_sqrt, sin, cos, atan2 │
    └─────────────────────────────┘
```

### 模块依赖关系

```
main.c
  ├── acc_gry.h/c       (六轴传感器驱动)
  ├── magnetic.h/c      (磁力计驱动)
  ├── imu_9.h/c         (IMU集成: 采样→滤波→转换→解算→输出)
  │     ├── data_filter (窗口滤波)
  │     ├── attitude    (Mahony互补滤波, 四元数解算)
  │     │     └── my_math (快速数学函数)
  │     └── debug       (VOFA+数据输出)
  ├── in_flash.h/c      (Flash存储)
  ├── IIC_bus.h/c       (I2C总线驱动封装)
  ├── crc8_table.h/c    (CRC8/CRC16校验)
  ├── user_shell.h/c    (Shell命令行)
  │     └── shell_driver (命令解析引擎)
  └── debug.h/c         (printf重定向, VOFA协议)
```

---

## 四、逐模块详细分析

### 4.1 main.c — 主程序入口

```c
int main(void)
{
    HAL_Init();                          // HAL库初始化
    SystemClock_Config();                // 配置170MHz系统时钟
    MX_GPIO_Init();                      // GPIO初始化
    MX_I2C1_Init();                      // I2C1初始化 (磁力计)
    MX_I2C3_Init();                      // I2C3初始化 (六轴)
    MX_TIM2_Init();                      // TIM2初始化 (1ms定时中断)
    MX_USART1_UART_Init();               // USART1初始化 (Shell, 2Mbps)
    MX_USB_Device_Init();                // USB CDC虚拟串口初始化
    HAL_Delay(1000);                     // 等待外设稳定
    user_shell_init();                   // 初始化命令行
    imu_init();                          // IMU初始化
    while (1) {
        imu_9_shell_cmd_to_do();         // 轮询执行Shell命令
    }
}
```

**设计要点**:
- 主循环极其简洁，只有 `imu_9_shell_cmd_to_do()` 一个函数
- 所有IMU实时采集、滤波、解算、输出都在 **TIM2中断** (1KHz) 中完成
- Shell命令通过中断接收，主循环旗标方式异步执行

### 4.2 BSP层 — 底层驱动

#### 4.2.1 IIC_bus.c/h — I2C总线驱动

封装了 I2C1 和 I2C3 两路 I2C 总线的读写操作，统一使用 HAL 库的 `HAL_I2C_Mem_Read/Write` 函数，8位寄存器地址模式。

```c
// 对外API
int32_t BSP_I2C1_WriteReg(DevAddr, Reg, pData, Length);  // I2C1写 (磁力计)
int32_t BSP_I2C1_ReadReg(DevAddr, Reg, pData, Length);   // I2C1读
int32_t BSP_I2C3_WriteReg(DevAddr, Reg, pData, Length);  // I2C3写 (六轴)
int32_t BSP_I2C3_ReadReg(DevAddr, Reg, pData, Length);   // I2C3读
```

**设计要点**:
- 两路 I2C 均配置为 Fast Plus (1MHz)，保证高采样率下的数据传输
- 静态内部函数封装 HAL 调用，超时设置为 1000ms
- `reg_cfg_t` 结构体 `{reg, dat}` 用于统一配置寄存器

#### 4.2.2 crc8_table.c/h — CRC校验

提供 CRC8 和 CRC16 校验算法：

- **CRC8**: 多项式 `X⁸+X²+X+1` (0x07)，逐位计算法 (crc_high_first)
- **CRC16**: 多项式 CCITT 标准 `0x1021`，逐位计算法

> 注: 代码中包含了 CRC8 查表法的预计算表 (已注释)，当前使用逐位计算。写 Flash 前的数据完整性校验可能依赖此模块。

#### 4.2.3 in_flash.c/h — 内部Flash存储

使用 STM32G431 内部 Flash 最后 2KB (0x0801F800) 存储校准参数：

| 地址偏移 | 存储内容 | 大小 |
|----------|----------|------|
| +0 | 加速度零点 (acc_zero[3]) | 6 bytes |
| +6 | 陀螺仪零点 (gyro_zero[3]) | 6 bytes |
| +12 | 磁力计零点 (mag_zero[3]) | 6 bytes |
| +18 | 输出模式 (output_mode) | 2 bytes |
| +20 | 磁力计X轴校准系数 (×1000) | 2 bytes |
| +22 | 磁力计Y轴校准系数 (×1000) | 2 bytes |

**Flash操作函数**:
```c
void STMFLASH_Read(ReadAddr, pBuffer, NumToRead);    // 读取Flash
void STMFLASH_Write(WriteAddr, pBuffer, NumToWrite);  // 写入Flash (自动解锁/上锁)
int  FLASH_ErasePage(pageAddress, nbPages);           // 擦除页
```

**设计要点**:
- 写入前先用 HAL_FLASH_Unlock 解锁，写完后 HAL_FLASH_Lock 上锁
- `union_t` 联合体提供 64位/32位/16位/8位 多粒度访问同一 Flash 页
- Flash 读取时：若原始值为 0xFFFF (未编程)，则使用默认值（如零点=0，磁力计比例=1.0）
- `restore` 命令直接擦除整个 Flash 页，恢复出厂设置

### 4.3 传感器驱动层

#### 4.3.1 acc_gry.c — LSM6DS3TR 六轴驱动

**初始化配置** (acc_gyro_init):

| 寄存器 | 值 | 含义 |
|--------|-----|------|
| CTRL3_C | 0x01 | 软件复位 |
| CTRL3_C | 0x44 | BDU使能+IF_INC自动增量 |
| CTRL1_XL | 0x52 | ODR=1660Hz, ±2g, BW=400Hz, LPF2 |
| CTRL8_XL | 0xA8 | LPF2使能, HP滤波使能, 斜率使能 |
| CTRL2_G | 0x50 | ODR=1660Hz, ±500dps |

**采样函数** (acc_gyro_sample_data):
```c
void acc_gyro_sample_data(int16_t *gyro, int16_t *acc)
{
    // 1. 读取加速度 (6字节: X_L, X_H, Y_L, Y_H, Z_L, Z_H)
    BSP_I2C3_ReadReg(0xD4, ACCEL_XOUT_L, r_data, 6);
    acc[0] = r_data[0] | (r_data[1] << 8);  // X
    acc[1] = r_data[2] | (r_data[3] << 8);  // Y
    acc[2] = r_data[4] | (r_data[5] << 8);  // Z

    // 2. 读取陀螺仪 (6字节)
    BSP_I2C3_ReadReg(0xD4, GYRO_XOUT_L, r_data, 6);
    gyro[0] = r_data[0] | (r_data[1] << 8);  // X
    gyro[1] = r_data[2] | (r_data[3] << 8);  // Y
    gyro[2] = r_data[4] | (r_data[5] << 8);  // Z
}
```

**校准函数** (set_acc_gyro_offset):
- 采集 20 组数据，求均值作为零偏
- 加速度 Z 轴零偏额外减去 16384 (对应 1g 重力)
- 校准结果存入 Flash

#### 4.3.2 magnetic.c — LIS2MDLTR 磁力计驱动

**初始化配置** (mag_init):

| 寄存器 | 值 | 含义 |
|--------|-----|------|
| CFG_REG_A | 0x8C | 温度补偿使能, ODR=100Hz, 连续模式 |
| CFG_REG_B | 0x03 | 偏移抵消使能, 低通滤波使能 |
| CFG_REG_C | 0x10 | BDU使能 (数据完整性保护) |

**校准函数** (mag_set_offset) — 椭圆拟合法:
```c
void mag_set_offset(void)
{
    // 1. 旋转传感器，采集 5000 组磁力计数据
    // 2. 记录各轴最大/最小值
    // 3. 计算软铁校正系数: Xsf = (Ymax-Ymin)/(Xmax-Xmin), Ysf 互易
    // 4. 计算硬铁偏移: Xoffset = ((Xmax-Xmin)/2 - Xmax) * Xsf
    // 5. 存入 Flash
}
```

**设计要点**:
- 磁力计校准采用 **最大-最小值椭圆拟合法**，同时校正硬铁和软铁效应
- 校准系数 Xsf/Ysf 乘以1000后存Flash (U16)，恢复时除以1000
- Z轴软铁校正被注释掉（只做XY平面校正）
- 校准需要约5秒旋转传感器 (5000次采样×1ms延时)

### 4.4 数据滤波层

#### 4.4.1 data_filter.c — 信号滤波器

**窗口滑动平均滤波** (window_filter):
```c
int16_t window_filter(int16_t data, int16_t *buf, uint8_t len)
{
    // 1. 滑动窗口: buf[0..len-2] 前移一位, buf[len-1]=新数据
    // 2. 对窗口内所有数据求和
    // 3. 返回平均值 = sum / len
}
```
- 窗口大小: 5 (WIN_NUM=5)
- 应用于九轴原始数据，降低高频噪声
- 简单但有效，计算量极低

**RC低通滤波器** (LowPassFilter_RC):
```c
// 一阶RC低通滤波: Vo(k) = C1*Vi(k) + C2*Vo(k-1)
// 截止频率: 2Hz
// C1 = 1/(1+RC*Fs), C2 = RC*Fs/(1+RC*Fs)
// RC = 1/(2π*Fc)
```

**RC高通滤波器** (high_pass_filter):
```c
// 一阶RC高通滤波: out = (in - in_p + out_p) * coff
// 截止频率: 5Hz
// coff = RC/(RC+1/Fs)
```
> 注: 高通和低通滤波器在头文件中声明但**实际姿态解算中未被调用**，main路径使用的是窗口滤波。

#### 4.4.2 kalman_filter.c — 卡尔曼滤波器

**用途**: 将陀螺仪 Z 轴积分偏航角与磁力计偏航角进行卡尔曼融合，获得更平滑的偏航估计。

```c
void loop_kalman(float gyro_z, float magYaw, float kalman_dt)
{
    // 第1步: 先验预测 (基于陀螺仪积分)
    pre_x = x_last + gyro_z * dt;

    // 第2步: 先验方差预测
    p = p_last + q;          // q = 0.0001 (过程噪声)

    // 第3步: 卡尔曼增益计算
    k = p / (p + r);         // r = 0.01 (测量噪声)

    // 第4步: 后验估计 (融合磁力计观测)
    x = pre_x + k * (magYaw - pre_x);

    // 第5步: 后验方差更新
    p = (1 - k) * p;
}
```

**参数配置**:
- 过程噪声 Q = 0.0001 (信任陀螺仪积分，变化慢)
- 测量噪声 R = 0.01 (磁力计噪声较大)
- 初始状态: x=0, p=1

**设计要点**:
- 此卡尔曼滤波是**一维**的，仅用于偏航角融合，不参与 roll/pitch 解算
- 在实际代码中通过 `Kalman_cal_yaw_angle()` 调用（在 imu_9.h 声明）
- 磁偏角 α 预设为0，可查表修正

### 4.5 数学工具层 — my_math.c

为追求嵌入式实时性，实现了快速版本的数学函数：

#### 快速平方根倒数 (fast_sqrt)
```c
float fast_sqrt(float number)
{
    // 使用著名的 Quake III "0x5f3759df" 魔法数实现快速平方根倒数
    // 两次牛顿迭代提高精度
    return number * y;  // y 是 1/sqrt(number) 的近似值
}
```

#### 快速正弦 (my_sin)
```c
float my_sin(float angle)
{
    // 使用二次多项式近似: sin(x) ≈ x*(1.2732 ± 0.4053*x)
    // 再通过一次校正提高精度
    // 误差约 ±0.001 弧度
}
```

#### 快速反正切 (arctan1 / arctan2)
```c
float arctan1(float tan)
{
    // 分段有理函数近似
    // |tan|>1 时: angle ≈ 90 - |1/tan|*(45 - (|1/tan|-1)*(14+3.83*|1/tan|))
    // |tan|≤1 时: angle ≈ |tan|*(45 - (|tan|-1)*(14+3.83*|tan|))
    // 精度约 ±0.09°
}
```

**设计要点**:
- 所有数学函数均为**自实现**，不依赖标准库的 math.h（仅在少数地方用标准库 atan2）
- 使用 FPU (Cortex-M4F 硬件浮点)，计算速度远快于软件浮点
- 角度归一化函数 `translateAngle()` 将任意角度映射到 [-180°, 180°]

### 4.6 姿态解算核心 — attitude.c (Mahony 互补滤波)

这是整个工程最核心的模块，实现了完整的 **四元数 Mahony 互补滤波算法**。

#### 4.6.1 核心数据结构

```c
typedef struct Pose_Module {
    Flag flag;              // 运行标志 (run, use_mag)
    Pose_Interface interface; // 输入: 九轴传感器数据
    Pose_Process process;     // 中间变量: 四元数, 误差, 磁力计偏航
    Pose_Data data;           // 输出: 欧拉角, 旋转矩阵, 世界坐标
    Pose_Parameter parameter; // 控制参数: KP, KI
} ATT_Module;
```

#### 4.6.2 完整解算流程 (calculate_attitude)

```
输入: 九轴原始数据 (acc, gyro, mag)
输出: 欧拉角 (roll, pitch, yaw), 四元数, 旋转矩阵, 世界加速度

┌─────────────────────────────────────────────────────────┐
│ 第1步: 电子罗盘处理 (use_mag=1时)                       │
│   将磁力计数据投影到水平面，计算磁力计偏航角 mag_yaw     │
│   计算当前偏航角与磁力计偏航的偏差 mag_yaw_bias           │
│   arctan2(mag_correct.y, mag_correct.x) → mag_yaw        │
│   correct_kp * (yaw - mag_yaw)          → mag_yaw_bias   │
├─────────────────────────────────────────────────────────┤
│ 第2步: 加速度计误差计算                                  │
│   归一化加速度 acc_tmp = a / |a|                         │
│   叉乘: error = acc_tmp × rotate_matrix[*,2]            │
│      即测量重力方向与估算重力方向的偏差                    │
│   低通滤波误差 (1Hz截止频率)                              │
├─────────────────────────────────────────────────────────┤
│ 第3步: 误差PI控制                                        │
│   误差积分 += error * KI * dt                            │
│   积分限幅: [-0.035, 0.035] 弧度 (约±2°)                 │
├─────────────────────────────────────────────────────────┤
│ 第4步: 陀螺仪修正                                        │
│   gyro_correct = gyro_raw * DEG2RAD                      │
│                - rotate_matrix * mag_yaw_bias (磁力计修正)│
│                + KP*error + error_integral (PI修正)      │
├─────────────────────────────────────────────────────────┤
│ 第5步: 一阶龙格-库塔更新四元数                           │
│   q += 0.5 * Ω(gyro_correct) * q * dt                   │
│   四元数归一化                                           │
├─────────────────────────────────────────────────────────┤
│ 第6步: 计算旋转矩阵 (从四元数)                           │
│   标准四元数→旋转矩阵公式                                │
│   计算世界坐标系下的加速度和磁力计值                      │
├─────────────────────────────────────────────────────────┤
│ 第7步: 求解欧拉角                                        │
│   roll  = arctan2(R[2][2], R[1][2])                     │
│   pitch = -arcsin(R[0][2])                               │
│   yaw   = arctan2(R[0][0], R[0][1])                     │
├─────────────────────────────────────────────────────────┤
│ 第8步: 计算去姿态影响的加速度和磁场                       │
│   acc_correct: 利用偏航角旋转世界加速度                  │
│   mag_correct: simple_3d_trans投影变换                   │
└─────────────────────────────────────────────────────────┘
```

#### 4.6.3 关键参数

| 参数 | 值 | 含义 |
|------|-----|------|
| error_kp | 5.5 | 加速度计误差比例增益 |
| error_ki | 1.25 | 加速度计误差积分增益 |
| correct_kp | 0.4 | 磁力计偏航修正增益 |
| 积分限幅 | ±0.035 rad (±2°) | 防止积分饱和 |

#### 4.6.4 加速度计有效性检测

```c
// 1. 各轴绝对值必须 < 1050mg (约1.05g)，避免高动态下加速度混入重力
// 2. 合成加速度模长必须在 [800, 1200] mg 之间 (正常范围 ±20% 容忍)
// 不满足条件时误差清零，仅靠陀螺仪积分维持姿态
```

**设计要点**:
- 这是一种**鲁棒性设计**：在高动态（加速度远超1g）时自动关闭加速度计修正，纯惯性积分，防止加速度计引入运动加速度误导姿态
- 坐标系为 ENU (东-北-天): X=北, Y=东, Z=天
- 磁力计轴向和六轴不一致，在接口处做了交换: `{m_x=m_y_raw, m_y=m_x_raw, m_z=-m_z_raw}`

### 4.7 IMU集成层 — imu_9.c

#### 4.7.1 初始化流程 (imu_init)

```c
void imu_init(void)
{
    1. acc_gyro_init();                    // 初始化LSM6DS3六轴
    2. mag_init();                         // 初始化LIS2MDL磁力计
    3. read_flash_information();           // 从Flash读取校准参数
    4. init_attitude(&attitude);           // 初始化姿态解算结构体
    5. HAL_TIM_Base_Start_IT(&htim2);      // 启动1KHz定时中断
}
```

#### 4.7.2 数据转换 (imu_data_transition)

将原始 ADC 值转换为物理单位：

```c
// 加速度: ±2g量程 → 除以 16393 → 单位 g (9.8m/s²)
f_acc[i] = (raw - zero[i]) / 16393.0f;

// 陀螺仪: ±500dps量程 → 除以 57.1 → 单位 °/s
f_gyro[i] = (raw - zero[i]) / 57.1f;

// 磁力计:  原始值 × 校准系数 × 1.5 → 单位 mGauss
f_mag[i] = (xsf * raw + zero[i]) * 1.5f;
```

**转换系数推导**:
- 加速度 ±2g = 16-bit signed → 1g = 32768/2 = 16384, 实际取 16393 (含校准修正)
- 陀螺仪 ±500dps = 500*1000/16bit → 1°/s = 32768/(500*1000/1000) ≈ 65.536... 实际取 57.1

#### 4.7.3 TIM2中断服务函数 — 实时数据流水线

```c
void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim)
{
    // TIM2配置: Prescaler=169, Period=999 → 1000Hz中断
    static uint16_t TimerCount = 0;
    TimerCount++;
    if(TimerCount >= imu_9.output_freq)  // 可调输出频率
    {
        // 1. 采样+窗口滤波+物理量转换
        imu_final_data_get();
        // 2. 姿态解算 (四元数Mahony)
        calculate_attitude(&attitude, 0.001);
        // 3. 磁力计偏航角 (备用)
        mag_yaw_test = atan2(f_mag[1], f_mag[0]) * 57.3f;
        // 4. 数据输出 (USB CDC → VOFA+)
        data_output_mode(output_mode);
    }
}
```

**数据输出模式** (data_output_mode):

| mode | 输出内容 | VOFA协议 |
|------|----------|----------|
| 0 | 欧拉角 (roll, pitch, yaw, mag_yaw) | FireWater USB |
| 1 | 四元数 (q0, q1, q2, q3) | FireWater USB |
| 2 | 去重力线性加速度 (x, y, z-1000, 2.0) | FireWater USB |
| 3 | 加速度原始数据 (g) | FireWater USB |
| 4 | 陀螺仪原始数据 (°/s) | FireWater USB |
| 5 | 磁力计数据 | FireWater USB |
| 6 | 九轴原始数据 (CSV格式) | printf |

#### 4.7.4 校准参数加载 (read_flash_information)

从 Flash 读取零点/系数时，若值为 0xFFFF (从未编程) 则使用默认值：
- 加速度零点: 0
- 陀螺仪零点: 0
- 磁力计零点: 0
- 磁力计软铁系数: 1.0 (1000/1000)
- 输出模式: 0 (欧拉角)

### 4.8 通信与调试

#### 4.8.1 shell_driver.c — 命令解析引擎

实现了一个轻量级的 Shell 命令解析器：

```c
// 命令格式: cmd <command> [arg1] [arg2] ...
// 使用 strtok 逐次分割空格分隔的参数
// 通过链表遍历注册的命令表
```

**核心解析流程**:
1. 接收字符 → shell_driver_main_loop(ch)
2. 检测到换行符 `\n` → parseCommand()
3. 第一个token校验: 必须是 `"cmd"`（前缀过滤）
4. 第二个token匹配: 遍历命令表链表
5. 后续token: 解析参数，调用对应回调函数

#### 4.8.2 user_shell.c — 用户命令注册

**命令表**:

| 命令 | 参数 | 功能 |
|------|------|------|
| `cmd cali a+g` | — | 校准加速度计+陀螺仪零点 |
| `cmd cali mag` | — | 校准磁力计 (5秒旋转) |
| `cmd output euler` | — | 输出欧拉角 |
| `cmd output quaternion` | — | 输出四元数 |
| `cmd output earth_a` | — | 输出世界坐标系线性加速度 |
| `cmd output acc` | — | 输出三轴加速度原始数据 |
| `cmd output gyro` | — | 输出三轴陀螺仪原始数据 |
| `cmd output mag` | — | 输出三轴磁力计数据 |
| `cmd output acc_gyro_mag` | — | 输出九轴原始数据 (CSV) |
| `cmd freq <N>` | — | 设置输出间隔 (N ms) |
| `cmd reset` | — | 软件复位 |
| `cmd restore` | — | 擦除Flash校准参数并复位 |

**异步执行机制**:
- Shell 回调函数仅设置 `imu_9.shell_cmd_ok = 1` 和对应的旗标
- 主循环 `imu_9_shell_cmd_to_do()` 轮询旗标，在非中断上下文中执行实际校准/配置操作
- 校准期间暂停数据输出 (`cali_flag != 0` 时 TIM2 中断跳过采样)

#### 4.8.3 debug.c — VOFA+可视化调试

**printf 重定向**:
```c
int fputc(int ch, FILE *f) {
    HAL_UART_Transmit(&huart1, &ch, 1, 0xffff);  // USART1
}
int _write(int32_t file, uint8_t *ptr, int32_t len) {
    CDC_Transmit_FS(buf, length);                // USB CDC
}
```

**VOFA+ 通信协议**:

1. **FireWater (CSV文本)**:
   ```
   simples:roll,pitch,yaw,mag_yaw\n
   ```

2. **JustFloat (原始浮点)**:
   ```
   [4×float data][0x00,0x00,0x80,0x7f]  // 帧尾
   ```

---

## 五、数据流全景

```
[LSM6DS3] ──I2C3──→ acc_gyro_sample_data()
                        ↓
                  int16_t raw[6]
                        ↓
[LIS2MDL] ──I2C1──→ mag_sample_data()
                        ↓
                  int16_t raw[3]
                        ↓
        ┌───────────────┴───────────────┐
        │     window_filter(x5)          │  滑动窗口滤波 (窗口大小5)
        │     (acc×3, gyro×3, mag×3)    │
        └───────────────┬───────────────┘
                        ↓
        ┌──────────────────────────────┐
        │  imu_data_transition()        │  原始值→物理单位转换
        │  acc: /16393 → g              │
        │  gyro: /57.1 → °/s            │
        │  mag: ×xsf ×1.5 → mGauss      │
        └───────────────┬──────────────┘
                        ↓
        ┌──────────────────────────────┐
        │  calculate_attitude()         │
        │  ┌─ 加速度计叉乘误差 ──────┐  │
        │  │  PI修正陀螺仪           │  │
        │  ├─ 磁力计偏航修正 ────────┤  │
        │  │                          │  │
        │  ├─ 龙格库塔更新四元数 ────┤  │
        │  ├─ 四元数→旋转矩阵 ───────┤  │
        │  ├─ 旋转矩阵→欧拉角 ───────┤  │
        │  └─ 计算世界坐标加速度磁场 ┘  │
        └───────────────┬──────────────┘
                        ↓
        ┌──────────────────────────────┐
        │  data_output_mode()           │
        │  → vofa_FireWater_USB_output  │
        │  → CDC_Transmit_FS()          │
        │  → USB CDC → 上位机 VOFA+     │
        └──────────────────────────────┘
```

---

## 六、关键算法详解

### 6.1 Mahony 互补滤波原理

本工程采用四元数 Mahony 互补滤波进行姿态解算，核心思想：

1. **陀螺仪**: 提供高频动态响应，但长期积分漂移
2. **加速度计**: 提供绝对重力方向参考 (roll/pitch)，但受运动加速度干扰
3. **磁力计**: 提供绝对航向参考 (yaw)，但噪声大、易受硬铁/软铁干扰

通过 **PI控制器** 融合三者优势：
```
修正量 = KP × (加速度计叉乘误差) + KI × ∫(加速度计叉乘误差)dt + 磁力计偏航修正
```

### 6.2 叉乘误差的几何意义

加速度计测量值归一化后 `â`，旋转矩阵第三列 `R[:,2]` 是重力方向在机体坐标系的投影。两者的**向量叉积** = `sin(θ)n̂`，θ 就是姿态误差角：

```
error = â × R[:,2]
     = |â|×|R[:,2]|×sin(θ)×n̂
     ≈ θ × n̂   (当 |â|≈1, |R[:,2]|≈1, θ≈0)
```

这个误差正是 PI 控制器需要消除的量。

### 6.3 四元数微分方程 (一阶龙格-库塔)

四元数微分方程: `q̇ = 0.5 × Ω(ω) × q`

一阶 RK4 近似: `q(t+dt) ≈ q(t) + 0.5 × Ω(ω) × q × dt`

其中 Ω(ω) 是角速度构建的反对称矩阵。

### 6.4 磁力计椭圆校正

磁力计在理想无干扰情况下，水平旋转一圈数据应形成一个圆心在原点的圆。但实际中：

- **硬铁效应**: 圆点偏移 → `offset = (max+min)/2`
- **软铁效应**: 圆变椭圆 → `scale = (Y_range)/(X_range)`

本工程只在 XY 平面做校正（Z轴省略），先找最大最小值，再计算偏移和缩放系数。

### 6.5 卡尔曼偏航融合

陀螺仪Z轴积分偏航角 + 磁力计偏航角 → 一维卡尔曼滤波：

- 状态方程: `x = x_last + gyro_z × dt` (过程模型)
- 观测方程: `z = mag_yaw` (测量模型)
- Q=0.0001 (信任过程模型), R=0.01 (磁力计噪声大)
- 结果: 卡尔曼增益倾向于信任陀螺仪长期积分，仅在磁力计数据较好时进行修正

---

## 七、工程亮点与设计特点

### 7.1 架构优势

1. **模块化分层清晰**: BSP → 驱动 → 滤波 → 解算 → 输出，每层独立
2. **实时性保证**: 核心解算在 1KHz 中断中完成，主循环极简
3. **自实现快速数学库**: 避免标准库浮点运算开销，适合嵌入式
4. **Flash掉电保存**: 校准参数持久化，上电自动加载
5. **Shell命令行交互**: 类似 RTOS shell，无需重新编译即可切换模式

### 7.2 鲁棒性设计

1. **加速度计有效性检测**: 模长检查 + 各轴幅值检查，高动态时自动关闭修正
2. **积分限幅**: 防止 PI 积分饱和
3. **磁力计偏差保护**: 偏差过大时清零，防止错误修正
4. **Flash未编程默认值**: 首次上电自动使用安全默认值

### 7.3 改进空间

1. **磁力计 Z 轴校正缺失**: mag_set_offset 中 Z 轴偏移被设为0
2. **卡尔曼偏航融合未在 TIM2 中断中调用**: `Kalman_cal_yaw_angle()` 声明但未被调用
3. **CRC 模块未在 Flash 写入前使用**: 写 Flash 时无 CRC 校验
4. **互补滤波 attitude_algorithm.c 未集成**: 代码中有一个更简单的互补滤波实现（只做 roll/pitch），但实际使用 attitude.c 的 Mahony 滤波
5. **Fusion 库引用失效**: Debug 产物引用 `Fusion_algorithm.c` 但源码不在此工程中（疑似原作者的 Sensor Fusion 库未公开）

---

## 八、文件清单

| 文件 | 行数 | 功能 |
|------|------|------|
| Core/Src/main.c | 203 | 主程序入口，170MHz时钟配置 |
| user/bsp/IIC_bus.c | 186 | I2C1/I2C3读写封装 |
| user/bsp/crc8_table.c | 364 | CRC8/CRC16校验 |
| user/bsp/in_flash.c | 114 | Flash读/写/擦除 |
| user/acc_gry_mag/acc_gry.c | 121 | LSM6DS3六轴驱动+校准 |
| user/acc_gry_mag/magnetic.c | 203 | LIS2MDL磁力计驱动+椭圆校准 |
| user/data_filter/data_filter.c | 106 | 窗口滤波+RC低通/高通 |
| user/data_filter/kalman_filter.c | 56 | 一维卡尔曼偏航融合 |
| user/attitude_calculation/my_math.c | 159 | 快速sin/cos/atan2/sqrt |
| user/attitude_calculation/attitude.c | 299 | Mahony四元数互补滤波核心 |
| user/imu_algorithm/imu_9.c | 276 | IMU集成: 采样→滤波→解算→输出 |
| user/imu_algorithm/attitude_algorithm.c | 90 | 简化互补滤波 (备用) |
| user/communicate/user_shell.c | 229 | Shell命令注册 |
| user/communicate/shell_driver.c | 147 | Shell命令解析引擎 |
| user/vofa_debug/debug.c | 125 | printf重定向+VOFA协议输出 |

**总计**: 约 2700 行用户代码 (不含 HAL 和中件间库)

---

> 分析完毕。此文档对所有源代码模块进行了逐行级的功能实现分析和算法原理阐述。
